import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import type {
  Round as PrismaRound,
  Ticket as PrismaTicket,
  Vote as PrismaVote,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type {
  ParticipantRole,
  ParticipantView,
  PublicVote,
  RoomStatePayload,
  Round,
  Ticket,
} from '../shared';
import { toPublicRoom } from '../rooms/rooms.service';
import { TicketsService } from '../tickets/tickets.service';

export interface JoinResult {
  roomId: string;
  participantId: string;
}

/**
 * Бизнес-логика голосования: вход в комнату, приём голосов,
 * раскрытие и сброс раундов, сборка публичного состояния. Используется PokerGateway.
 */
@Injectable()
export class PokerService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tickets: TicketsService,
  ) {}

  /** Присоединить участника к комнате (upsert по паре roomId+userId). */
  async joinRoom(roomCode: string, userId: string, role?: ParticipantRole): Promise<JoinResult> {
    const room = await this.prisma.room.findUnique({ where: { code: roomCode } });
    if (!room || room.status === 'CLOSED') {
      throw new NotFoundException('Комната не найдена');
    }
    const participant = await this.prisma.participant.upsert({
      where: { roomId_userId: { roomId: room.id, userId } },
      create: { roomId: room.id, userId, role: role ?? 'VOTER' },
      update: role ? { role } : {},
    });
    return { roomId: room.id, participantId: participant.id };
  }

  /** Удалить участника (при отключении сокета). Голоса каскадно удаляются. */
  async removeParticipant(participantId: string): Promise<void> {
    await this.prisma.participant.delete({ where: { id: participantId } }).catch(() => undefined);
  }

  /** Принять/обновить голос участника в раунде. */
  async castVote(roundId: string, participantId: string, value: string): Promise<void> {
    const round = await this.prisma.round.findUnique({ where: { id: roundId } });
    if (!round || round.status !== 'VOTING') {
      throw new ForbiddenException('Голосование по раунду недоступно');
    }
    await this.prisma.vote.upsert({
      where: { roundId_participantId: { roundId, participantId } },
      create: { roundId, participantId, value },
      update: { value },
    });
  }

  /** Создать тикет в комнате (только владелец). */
  async createTicket(roomId: string, userId: string, title?: string): Promise<PrismaTicket> {
    await this.assertOwner(roomId, userId);
    return this.tickets.create(roomId, title);
  }

  /** Выбрать тикет на оценку: открыть новый раунд (только владелец). */
  async selectTicket(roomId: string, userId: string, ticketId: string): Promise<void> {
    await this.assertOwner(roomId, userId);
    const ticket = await this.prisma.ticket.findFirst({ where: { id: ticketId, roomId } });
    if (!ticket) {
      throw new NotFoundException('Тикет не найден');
    }
    // Снимаем активность с прочих тикетов и активируем выбранный.
    await this.prisma.ticket.updateMany({
      where: { roomId, status: 'VOTING' },
      data: { status: 'PENDING' },
    });
    await this.prisma.ticket.update({ where: { id: ticketId }, data: { status: 'VOTING' } });
    await this.prisma.round.create({ data: { ticketId } });
  }

  /** Раскрыть текущий раунд (только владелец) и зафиксировать среднюю оценку тикета. */
  async revealRound(roomId: string, userId: string, roundId: string): Promise<void> {
    await this.assertOwner(roomId, userId);
    const round = await this.prisma.round.update({
      where: { id: roundId },
      data: { status: 'REVEALED', revealedAt: new Date() },
    });
    // Считаем среднее по числовым голосам и сохраняем как результат тикета.
    // Статус оставляем VOTING — тикет остаётся активным (показываем результат и
    // даём «переголосовать»); в историю он уйдёт, когда выберут следующий тикет.
    const votes = await this.prisma.vote.findMany({ where: { roundId } });
    const estimate = averageEstimate(votes.map((v) => v.value));
    await this.prisma.ticket.update({
      where: { id: round.ticketId },
      data: { finalEstimate: estimate },
    });
  }

  /** Сменить роль участника (голосующий ⇄ наблюдатель). Доступно самому участнику. */
  async setRole(participantId: string, role: ParticipantRole): Promise<void> {
    await this.prisma.participant.update({ where: { id: participantId }, data: { role } });
    // Наблюдателя не ждём за столом — снимаем его голос в открытых раундах.
    if (role === 'SPECTATOR') {
      await this.prisma.vote.deleteMany({
        where: { participantId, round: { status: 'VOTING' } },
      });
    }
  }

  /** Переголосовать: открыть новый раунд по тикету (только владелец). */
  async resetRound(roomId: string, userId: string, ticketId: string): Promise<void> {
    await this.assertOwner(roomId, userId);
    const ticket = await this.prisma.ticket.findFirst({ where: { id: ticketId, roomId } });
    if (!ticket) {
      throw new NotFoundException('Тикет не найден');
    }
    await this.prisma.ticket.update({ where: { id: ticketId }, data: { status: 'VOTING' } });
    await this.prisma.round.create({ data: { ticketId } });
  }

  /** Голоса текущего раунда в публичном виде (значения только после раскрытия). */
  async getPublicVotes(roundId: string, revealed: boolean): Promise<PublicVote[]> {
    const votes = await this.prisma.vote.findMany({ where: { roundId } });
    return votes.map((v) => buildPublicVote(v, revealed));
  }

  /** Собрать полное публичное состояние комнаты для рассылки room:state. */
  async buildRoomState(roomCode: string): Promise<RoomStatePayload> {
    const room = await this.prisma.room.findUnique({ where: { code: roomCode } });
    if (!room) {
      throw new NotFoundException('Комната не найдена');
    }

    const ticketsRaw = await this.tickets.listByRoom(room.id);
    const activeTicket = ticketsRaw.find((t) => t.status === 'VOTING') ?? null;

    let currentRound: PrismaRound | null = null;
    if (activeTicket) {
      currentRound = await this.prisma.round.findFirst({
        where: { ticketId: activeTicket.id },
        orderBy: { startedAt: 'desc' },
      });
    }

    const roundVotes: PrismaVote[] = currentRound
      ? await this.prisma.vote.findMany({ where: { roundId: currentRound.id } })
      : [];
    const revealed = currentRound?.status === 'REVEALED';
    const votedParticipantIds = new Set(roundVotes.map((v) => v.participantId));

    const participantsRaw = await this.prisma.participant.findMany({
      where: { roomId: room.id },
      include: { user: true },
      orderBy: { joinedAt: 'asc' },
    });
    const participants: ParticipantView[] = participantsRaw.map((p) => ({
      id: p.id,
      userId: p.userId,
      name: p.user.name,
      avatarUrl: p.user.avatarUrl,
      role: p.role,
      isOwner: p.userId === room.ownerId,
      hasVoted: votedParticipantIds.has(p.id),
    }));

    return {
      room: toPublicRoom(room),
      participants,
      tickets: ticketsRaw.map(toPublicTicket),
      activeTicketId: activeTicket?.id ?? null,
      currentRound: currentRound ? toPublicRound(currentRound) : null,
      votes: roundVotes.map((v) => buildPublicVote(v, revealed)),
    };
  }

  /** Проверить, что пользователь — владелец комнаты. */
  private async assertOwner(roomId: string, userId: string): Promise<void> {
    const room = await this.prisma.room.findUnique({ where: { id: roomId } });
    if (!room) {
      throw new NotFoundException('Комната не найдена');
    }
    if (room.ownerId !== userId) {
      throw new ForbiddenException('Действие доступно только владельцу комнаты');
    }
  }
}

/** Среднее по числовым голосам (спецкарты ?, ☕ и нечисловые шкалы игнорируются). */
function averageEstimate(values: string[]): string | null {
  const nums = values
    .filter((v) => v.trim() !== '' && !Number.isNaN(Number(v)))
    .map(Number);
  if (nums.length === 0) return null;
  return (nums.reduce((a, b) => a + b, 0) / nums.length).toFixed(1);
}

function buildPublicVote(vote: PrismaVote, revealed: boolean): PublicVote {
  return {
    participantId: vote.participantId,
    hasVoted: true,
    value: revealed ? vote.value : undefined,
  };
}

function toPublicTicket(ticket: PrismaTicket): Ticket {
  return {
    id: ticket.id,
    roomId: ticket.roomId,
    title: ticket.title,
    externalKey: ticket.externalKey,
    description: ticket.description,
    finalEstimate: ticket.finalEstimate,
    status: ticket.status,
    order: ticket.order,
  };
}

function toPublicRound(round: PrismaRound): Round {
  return {
    id: round.id,
    ticketId: round.ticketId,
    status: round.status,
    startedAt: round.startedAt.toISOString(),
    revealedAt: round.revealedAt ? round.revealedAt.toISOString() : null,
  };
}
