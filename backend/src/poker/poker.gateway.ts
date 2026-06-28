import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { CommandBus } from '@nestjs/cqrs';
import { Server, Socket } from 'socket.io';
import { AuthTokensService } from '../auth/auth-tokens.service';
import {
  ClientEvents,
  ServerEvents,
  type CastVotePayload,
  type CreateTicketPayload,
  type ErrorPayload,
  type JoinRoomPayload,
  type ResetRoundPayload,
  type RevealRoundPayload,
  type SelectTicketPayload,
} from '../shared';
import { CreateGuestUserCommand } from '../users/cqrs';
import { PokerService } from './poker.service';

/** Привязка сокета к участнику комнаты (для рассылки и очистки при отключении). */
interface SocketSession {
  roomCode: string;
  roomId: string;
  participantId: string;
  userId: string;
}

@WebSocketGateway({
  cors: { origin: process.env.CORS_ORIGIN ?? 'http://localhost:3000' },
})
export class PokerGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  /** socket.id -> сессия участника. */
  private readonly sessions = new Map<string, SocketSession>();

  constructor(
    private readonly pokerService: PokerService,
    private readonly commandBus: CommandBus,
    private readonly tokens: AuthTokensService,
  ) {}

  /**
   * Определить userId для входа в комнату:
   * — при валидном JWT-токене берём зарегистрированного пользователя;
   * — иначе создаём анонимного гостя по имени.
   */
  private async resolveUserId(payload: JoinRoomPayload): Promise<string> {
    if (payload.token) {
      const userId = await this.tokens.verifyAccessToken(payload.token);
      if (userId) {
        return userId;
      }
    }
    const guest = await this.commandBus.execute(new CreateGuestUserCommand(payload.userName));
    return guest.id;
  }

  /** Разослать актуальное состояние комнаты всем её участникам. */
  private async broadcastState(roomCode: string): Promise<void> {
    const state = await this.pokerService.buildRoomState(roomCode);
    this.server.to(roomCode).emit(ServerEvents.ROOM_STATE, state);
  }

  /** Отправить ошибку конкретному клиенту. */
  private emitError(client: Socket, message: string): void {
    const payload: ErrorPayload = { message };
    client.emit(ServerEvents.ERROR, payload);
  }

  handleConnection(client: Socket): void {
    void client;
  }

  async handleDisconnect(client: Socket): Promise<void> {
    const session = this.sessions.get(client.id);
    if (!session) return;
    this.sessions.delete(client.id);
    await this.pokerService.removeParticipant(session.participantId);
    this.server.to(session.roomCode).emit(ServerEvents.PARTICIPANT_LEFT, {
      participantId: session.participantId,
    });
    await this.broadcastState(session.roomCode).catch(() => undefined);
  }

  @SubscribeMessage(ClientEvents.JOIN_ROOM)
  async handleJoinRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: JoinRoomPayload,
  ): Promise<{ participantId: string; userId: string } | void> {
    try {
      const roomCode = payload.roomCode.toUpperCase();
      const userId = await this.resolveUserId(payload);
      const { roomId, participantId } = await this.pokerService.joinRoom(
        roomCode,
        userId,
        payload.role,
      );
      await client.join(roomCode);
      this.sessions.set(client.id, { roomCode, roomId, participantId, userId });
      this.server.to(roomCode).emit(ServerEvents.PARTICIPANT_JOINED, { participantId });
      await this.broadcastState(roomCode);
      // Возвращаем клиенту его идентификаторы через ack — чтобы UI знал «кто я».
      return { participantId, userId };
    } catch (err) {
      this.emitError(client, errorMessage(err, 'Не удалось войти в комнату'));
    }
  }

  @SubscribeMessage(ClientEvents.CREATE_TICKET)
  async handleCreateTicket(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: CreateTicketPayload,
  ): Promise<void> {
    const session = this.sessions.get(client.id);
    if (!session) return;
    try {
      await this.pokerService.createTicket(session.roomId, session.userId, payload.title);
      await this.broadcastState(session.roomCode);
    } catch (err) {
      this.emitError(client, errorMessage(err, 'Не удалось создать тикет'));
    }
  }

  @SubscribeMessage(ClientEvents.SELECT_TICKET)
  async handleSelectTicket(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: SelectTicketPayload,
  ): Promise<void> {
    const session = this.sessions.get(client.id);
    if (!session) return;
    try {
      await this.pokerService.selectTicket(session.roomId, session.userId, payload.ticketId);
      await this.broadcastState(session.roomCode);
    } catch (err) {
      this.emitError(client, errorMessage(err, 'Не удалось выбрать тикет'));
    }
  }

  @SubscribeMessage(ClientEvents.CAST_VOTE)
  async handleCastVote(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: CastVotePayload,
  ): Promise<void> {
    const session = this.sessions.get(client.id);
    if (!session) return;
    try {
      await this.pokerService.castVote(payload.roundId, session.participantId, payload.value);
      const votes = await this.pokerService.getPublicVotes(payload.roundId, false);
      this.server.to(session.roomCode).emit(ServerEvents.VOTE_UPDATED, {
        roundId: payload.roundId,
        votes,
      });
      await this.broadcastState(session.roomCode);
    } catch (err) {
      this.emitError(client, errorMessage(err, 'Не удалось сохранить голос'));
    }
  }

  @SubscribeMessage(ClientEvents.REVEAL_ROUND)
  async handleRevealRound(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: RevealRoundPayload,
  ): Promise<void> {
    const session = this.sessions.get(client.id);
    if (!session) return;
    try {
      await this.pokerService.revealRound(session.roomId, session.userId, payload.roundId);
      const votes = await this.pokerService.getPublicVotes(payload.roundId, true);
      this.server.to(session.roomCode).emit(ServerEvents.ROUND_REVEALED, {
        roundId: payload.roundId,
        votes,
      });
      await this.broadcastState(session.roomCode);
    } catch (err) {
      this.emitError(client, errorMessage(err, 'Не удалось раскрыть голоса'));
    }
  }

  @SubscribeMessage(ClientEvents.RESET_ROUND)
  async handleResetRound(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: ResetRoundPayload,
  ): Promise<void> {
    const session = this.sessions.get(client.id);
    if (!session) return;
    try {
      await this.pokerService.resetRound(session.roomId, session.userId, payload.ticketId);
      this.server.to(session.roomCode).emit(ServerEvents.ROUND_RESET, {
        ticketId: payload.ticketId,
      });
      await this.broadcastState(session.roomCode);
    } catch (err) {
      this.emitError(client, errorMessage(err, 'Не удалось переголосовать'));
    }
  }
}

/** Достать человекочитаемое сообщение об ошибке. */
function errorMessage(err: unknown, fallback: string): string {
  if (err instanceof Error && err.message) return err.message;
  return fallback;
}
