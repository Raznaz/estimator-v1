import { Injectable } from '@nestjs/common';
import type { Ticket as PrismaTicket } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TicketsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Добавить тикет в комнату; order = (максимальный в комнате) + 1. */
  async create(roomId: string, title?: string): Promise<PrismaTicket> {
    const last = await this.prisma.ticket.findFirst({
      where: { roomId },
      orderBy: { order: 'desc' },
      select: { order: true },
    });
    const order = (last?.order ?? -1) + 1;
    return this.prisma.ticket.create({
      data: {
        roomId,
        title: title?.trim() || `Задача ${order + 1}`,
        order,
      },
    });
  }

  /** Список тикетов комнаты в порядке очереди. */
  listByRoom(roomId: string): Promise<PrismaTicket[]> {
    return this.prisma.ticket.findMany({
      where: { roomId },
      orderBy: { order: 'asc' },
    });
  }
}
