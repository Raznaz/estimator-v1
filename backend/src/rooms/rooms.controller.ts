import { BadRequestException, Body, Controller, Get, Headers, Param, Post } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import type { User as PrismaUser } from '@prisma/client';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { AuthTokensService } from '../auth/auth-tokens.service';
import { ApiErrorResponse } from '../common/dto/api-error-response.dto';
import type { Room as PublicRoom } from '../shared';
import { CreateGuestUserCommand } from '../users/cqrs';
import { toPublicUser } from '../users/repository/user.repository';
import { CreateRoomDto } from './dto/create-room.dto';
import { CreateRoomResponse } from './dto/responses/create-room-response.dto';
import { RoomResponse } from './dto/responses/room-response.dto';
import { RoomsService, toPublicRoom } from './rooms.service';

/**
 * REST-эндпоинты комнат (`/rooms`).
 * Авторизация опциональна: создавать комнату может и зарегистрированный пользователь,
 * и аноним (тогда заводится гость-владелец и ему выпускаются токены).
 */
@ApiTags('rooms')
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
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Создать комнату',
    description:
      'С валидным Bearer-токеном владельцем становится текущий пользователь (токены не выпускаются). ' +
      'Без токена создаётся гость по ownerName, и ему выпускается пара токенов.',
  })
  @ApiCreatedResponse({ description: 'Комната создана', type: CreateRoomResponse })
  @ApiBadRequestResponse({ description: 'Не указано имя (ownerName) для гостя', type: ApiErrorResponse })
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
  @ApiOperation({ summary: 'Получить комнату по коду' })
  @ApiParam({ name: 'code', description: 'Код комнаты (регистр игнорируется)', example: 'ABCDEF' })
  @ApiOkResponse({ description: 'Данные комнаты', type: RoomResponse })
  @ApiNotFoundResponse({ description: 'Комната не найдена или закрыта', type: ApiErrorResponse })
  async findByCode(@Param('code') code: string): Promise<PublicRoom> {
    const room = await this.roomsService.findByCode(code.toUpperCase());
    return toPublicRoom(room);
  }
}
