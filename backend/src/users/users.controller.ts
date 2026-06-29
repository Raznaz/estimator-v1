import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  NotImplementedException,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { CurrentUser, type JwtUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ApiErrorResponse } from '../common/dto/api-error-response.dto';
import {
  ChangePasswordCommand,
  GetAvatarPresetsQuery,
  GetMyProfileQuery,
  UpdateProfileCommand,
} from './cqrs';
import { ChangePasswordDto } from './dto/change-password.dto';
import { AvatarPresetResponse } from './dto/responses/avatar-preset-response.dto';
import { UserResponse } from './dto/responses/user-response.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';

/**
 * REST-эндпоинты профиля пользователя (`/users`).
 * Все методы, кроме списка пресетов, защищены {@link JwtAuthGuard} и работают
 * с текущим пользователем из access-токена. Логика делегируется CQRS-шине.
 */
@ApiTags('users')
@Controller('users')
export class UsersController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  /**
   * `GET /users/avatars/presets` — публичный список 20 готовых аватаров.
   * Не требует авторизации.
   */
  @Get('avatars/presets')
  @ApiOperation({ summary: 'Публичный список готовых аватаров (DiceBear)' })
  @ApiOkResponse({ description: 'Список из 20 пресетов', type: [AvatarPresetResponse] })
  getAvatarPresets() {
    return this.queryBus.execute(new GetAvatarPresetsQuery());
  }

  /** `GET /users/me` — публичный профиль текущего пользователя. */
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get('me')
  @ApiOperation({ summary: 'Профиль текущего пользователя' })
  @ApiOkResponse({ description: 'Профиль пользователя', type: UserResponse })
  @ApiUnauthorizedResponse({ description: 'Отсутствует или недействителен access-токен', type: ApiErrorResponse })
  @ApiNotFoundResponse({ description: 'Пользователь не найден', type: ApiErrorResponse })
  getMe(@CurrentUser() user: JwtUser) {
    return this.queryBus.execute(new GetMyProfileQuery(user.userId));
  }

  /** `PATCH /users/me` — частичное обновление имени/email/аватара текущего пользователя. */
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Patch('me')
  @ApiOperation({ summary: 'Частичное обновление профиля' })
  @ApiOkResponse({ description: 'Обновлённый профиль', type: UserResponse })
  @ApiBadRequestResponse({ description: 'Ошибка валидации или недопустимый URL аватара', type: ApiErrorResponse })
  @ApiUnauthorizedResponse({ description: 'Отсутствует или недействителен access-токен', type: ApiErrorResponse })
  @ApiNotFoundResponse({ description: 'Пользователь не найден', type: ApiErrorResponse })
  @ApiConflictResponse({ description: 'Email уже используется', type: ApiErrorResponse })
  updateMe(@CurrentUser() user: JwtUser, @Body() dto: UpdateProfileDto) {
    return this.commandBus.execute(
      new UpdateProfileCommand(user.userId, dto.name, dto.email, dto.avatarUrl),
    );
  }

  /** `POST /users/me/password` — смена пароля (проверяет текущий пароль). */
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post('me/password')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Смена пароля' })
  @ApiNoContentResponse({ description: 'Пароль изменён' })
  @ApiBadRequestResponse({ description: 'Ошибка валидации или у пользователя не задан пароль', type: ApiErrorResponse })
  @ApiUnauthorizedResponse({ description: 'Нет токена или неверный текущий пароль', type: ApiErrorResponse })
  @ApiNotFoundResponse({ description: 'Пользователь не найден', type: ApiErrorResponse })
  changePassword(@CurrentUser() user: JwtUser, @Body() dto: ChangePasswordDto) {
    return this.commandBus.execute(
      new ChangePasswordCommand(user.userId, dto.oldPassword, dto.newPassword),
    );
  }

  /**
   * `POST /users/me/avatar` — загрузка файла аватара временно отключена.
   *
   * Раньше файл писался на локальный диск (`./uploads/avatars`), но на бесплатных
   * хостингах диск эфемерный и файлы теряются при каждом редеплое. До перевода
   * хранения на object storage эндпоинт возвращает 501; для смены аватара
   * используйте готовые пресеты (`GET /users/avatars/presets` + `PATCH /users/me`).
   * @throws NotImplementedException Всегда — загрузка файлов отключена.
   */
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post('me/avatar')
  @ApiOperation({ summary: 'Загрузка файла аватара (временно отключена — используйте пресеты)' })
  @ApiResponse({
    status: HttpStatus.NOT_IMPLEMENTED,
    description: 'Загрузка файлов временно отключена',
    type: ApiErrorResponse,
  })
  @ApiUnauthorizedResponse({ description: 'Отсутствует или недействителен access-токен', type: ApiErrorResponse })
  uploadAvatar(): never {
    throw new NotImplementedException(
      'Загрузка файлов аватара временно отключена. Выберите аватар из готовых пресетов: GET /users/avatars/presets, затем PATCH /users/me.',
    );
  }
}
