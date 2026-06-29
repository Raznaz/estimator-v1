import { BadRequestException, Body, Controller, Get, Headers, Param, Post } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import type { User as PrismaUser } from '@prisma/client';
import { AuthTokensService } from '../auth/auth-tokens.service';
import type { Room as PublicRoom, User as PublicUser } from '../shared';
import { CreateGuestUserCommand } from '../users/cqrs';
import { toPublicUser } from '../users/repository/user.repository';
import { CreateRoomDto } from './dto/create-room.dto';
import { RoomsService, toPublicRoom } from './rooms.service';

/** Ответ создания комнаты. Токены присутствуют только для нового гостя-владельца. */
interface CreateRoomResponse {
  room: PublicRoom;
  user?: PublicUser;
  accessToken?: string;
  refreshToken?: string;
}

/**
 * REST-эндпоинты комнат (`/rooms`).
 * Авторизация опциональна: создавать комнату может и зарегистрированный пользователь,
 * и аноним (тогда заводится гость-владелец и ему выпускаются токены).
 */
@Controller('rooms')
export class RoomsController {
  constructor(
    private readonly roomsService: RoomsService,
    private readonly commandBus: CommandBus,
    private readonly tokens: AuthTokensService,
  ) {}

  /**
   * Создать комнату.
   * — Если передан валидный Bearer — владелец = этот пользователь, токены не выпускаются.
   * — Иначе создаётся гость по ownerName и ему выпускается пара токенов
   *   (чтобы при сокет-входе он опознавался как тот же владелец).
   */
  @Post()
  async create(
    @Body() dto: CreateRoomDto,
    @Headers('authorization') authHeader?: string,
  ): Promise<CreateRoomResponse> {
    const bearer = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : undefined;
    const authedUserId = bearer ? await this.tokens.verifyAccessToken(bearer) : null;

    if (authedUserId) {
      const room = await this.roomsService.create({
        ownerId: authedUserId,
        name: dto.name,
        scaleType: dto.scaleType,
      });
      return { room: toPublicRoom(room) };
    }

    const ownerName = dto.ownerName?.trim();
    if (!ownerName) {
      throw new BadRequestException('Укажите имя для входа в комнату');
    }

    const guest: PrismaUser = await this.commandBus.execute(new CreateGuestUserCommand(ownerName));
    const room = await this.roomsService.create({
      ownerId: guest.id,
      name: dto.name,
      scaleType: dto.scaleType,
    });
    const auth = await this.tokens.issueTokens(toPublicUser(guest));

    return {
      room: toPublicRoom(room),
      user: auth.user,
      accessToken: auth.accessToken,
      refreshToken: auth.refreshToken,
    };
  }

  /** Получить комнату по коду (для проверки существования перед входом). */
  @Get(':code')
  async findByCode(@Param('code') code: string): Promise<PublicRoom> {
    const room = await this.roomsService.findByCode(code.toUpperCase());
    return toPublicRoom(room);
  }
}
