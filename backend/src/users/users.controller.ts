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
import { diskStorage } from 'multer';
import { extname } from 'node:path';
import { CurrentUser, type JwtUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  ChangePasswordCommand,
  GetAvatarPresetsQuery,
  GetMyProfileQuery,
  SetAvatarCommand,
  UpdateProfileCommand,
} from './cqrs';
import { ChangePasswordDto } from './dto/change-password.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';

const AVATAR_UPLOAD_DIR = './uploads/avatars';
const ALLOWED_MIME = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'];
const MAX_AVATAR_SIZE = 2 * 1024 * 1024; // 2 МБ

/**
 * REST-эндпоинты профиля пользователя (`/users`).
 * Все методы, кроме списка пресетов, защищены {@link JwtAuthGuard} и работают
 * с текущим пользователем из access-токена. Логика делегируется CQRS-шине.
 */
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
  getAvatarPresets() {
    return this.queryBus.execute(new GetAvatarPresetsQuery());
  }

  /** `GET /users/me` — публичный профиль текущего пользователя. */
  @UseGuards(JwtAuthGuard)
  @Get('me')
  getMe(@CurrentUser() user: JwtUser) {
    return this.queryBus.execute(new GetMyProfileQuery(user.userId));
  }

  /** `PATCH /users/me` — частичное обновление имени/email/аватара текущего пользователя. */
  @UseGuards(JwtAuthGuard)
  @Patch('me')
  updateMe(@CurrentUser() user: JwtUser, @Body() dto: UpdateProfileDto) {
    return this.commandBus.execute(
      new UpdateProfileCommand(user.userId, dto.name, dto.email, dto.avatarUrl),
    );
  }

  /** `POST /users/me/password` — смена пароля (проверяет текущий пароль). */
  @UseGuards(JwtAuthGuard)
  @Post('me/password')
  @HttpCode(HttpStatus.NO_CONTENT)
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
  @Post('me/avatar')
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
