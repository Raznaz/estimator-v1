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
  type CastVotePayload,
  type JoinRoomPayload,
  type ResetRoundPayload,
  type RevealRoundPayload,
} from '../shared';
import { CreateGuestUserCommand } from '../users/cqrs';
import { PokerService } from './poker.service';

@WebSocketGateway({
  cors: { origin: process.env.CORS_ORIGIN ?? 'http://localhost:3000' },
})
export class PokerGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

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

  handleConnection(client: Socket): void {
    // TODO: логировать/валидировать подключение
    void client;
  }

  handleDisconnect(client: Socket): void {
    // TODO: пометить участника отключившимся, разослать participant:left
    void client;
  }

  @SubscribeMessage(ClientEvents.JOIN_ROOM)
  async handleJoinRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: JoinRoomPayload,
  ): Promise<void> {
    // Резолвим пользователя (зарегистрированный по токену либо гость по имени)
    const userId = await this.resolveUserId(payload);
    // TODO: создать Participant(userId), client.join(roomCode), разослать room:state
    void client;
    void userId;
  }

  @SubscribeMessage(ClientEvents.CAST_VOTE)
  async handleCastVote(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: CastVotePayload,
  ): Promise<void> {
    // TODO: сохранить голос, разослать vote:updated (скрытые значения)
    void client;
    void payload;
  }

  @SubscribeMessage(ClientEvents.REVEAL_ROUND)
  async handleRevealRound(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: RevealRoundPayload,
  ): Promise<void> {
    // TODO: раскрыть раунд, разослать round:revealed с значениями
    void client;
    void payload;
  }

  @SubscribeMessage(ClientEvents.RESET_ROUND)
  async handleResetRound(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: ResetRoundPayload,
  ): Promise<void> {
    // TODO: открыть новый раунд по тикету, разослать round:reset
    void client;
    void payload;
  }
}
