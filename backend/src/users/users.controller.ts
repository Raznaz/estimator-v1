import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiConflictResponse,
  ApiConsumes,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { diskStorage } from 'multer';
import { extname } from 'node:path';
import { CurrentUser, type JwtUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ApiErrorResponse } from '../common/dto/api-error-response.dto';
import {
  ChangePasswordCommand,
  GetAvatarPresetsQuery,
  GetMyProfileQuery,
  SetAvatarCommand,
  UpdateProfileCommand,
} from './cqrs';
import { ChangePasswordDto } from './dto/change-password.dto';
import { AvatarPresetResponse } from './dto/responses/avatar-preset-response.dto';
import { UserResponse } from './dto/responses/user-response.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';

const AVATAR_UPLOAD_DIR = './uploads/avatars';
const ALLOWED_MIME = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'];
const MAX_AVATAR_SIZE = 2 * 1024 * 1024; // 2 МБ

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
   * `POST /users/me/avatar` — загрузка файла аватара (multipart, поле `file`).
   * Принимает PNG/JPEG/WebP/GIF до 2 МБ; сохраняет на диск и проставляет URL профилю.
   * @throws BadRequestException Если файл не передан или имеет недопустимый формат/размер.
   */
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post('me/avatar')
  @ApiOperation({ summary: 'Загрузка файла аватара (PNG/JPEG/WebP/GIF, до 2 МБ)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { file: { type: 'string', format: 'binary' } },
      required: ['file'],
    },
  })
  @ApiCreatedResponse({ description: 'Аватар сохранён, профиль обновлён', type: UserResponse })
  @ApiBadRequestResponse({ description: 'Файл не передан или недопустимый формат/размер', type: ApiErrorResponse })
  @ApiUnauthorizedResponse({ description: 'Отсутствует или недействителен access-токен', type: ApiErrorResponse })
  @ApiNotFoundResponse({ description: 'Пользователь не найден', type: ApiErrorResponse })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: AVATAR_UPLOAD_DIR,
        filename: (req, file, cb) => {
          const user = (req as { user?: JwtUser }).user;
          const unique = `${user?.userId ?? 'anon'}-${Date.now()}`;
          cb(null, `${unique}${extname(file.originalname)}`);
        },
      }),
      limits: { fileSize: MAX_AVATAR_SIZE },
      fileFilter: (_req, file, cb) => {
        cb(null, ALLOWED_MIME.includes(file.mimetype));
      },
    }),
  )
  uploadAvatar(@CurrentUser() user: JwtUser, @UploadedFile() file?: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('Файл не загружен или имеет недопустимый формат');
    }
    const avatarUrl = `/static/avatars/${file.filename}`;
    return this.commandBus.execute(new SetAvatarCommand(user.userId, avatarUrl));
  }
}
