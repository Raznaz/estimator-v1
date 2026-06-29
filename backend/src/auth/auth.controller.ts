import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { ApiErrorResponse } from '../common/dto/api-error-response.dto';
import { LoginCommand, LogoutCommand, RefreshTokenCommand, RegisterCommand } from './cqrs';
import { AuthResponse } from './dto/responses/auth-response.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';
import { RegisterDto } from './dto/register.dto';

/**
 * REST-эндпоинты аутентификации (`/auth`).
 * Контроллер только валидирует DTO и делегирует работу CQRS-хендлерам через `CommandBus`.
 */
@ApiTags('auth')
@ApiBadRequestResponse({ description: 'Ошибка валидации тела запроса', type: ApiErrorResponse })
@Controller('auth')
export class AuthController {
  constructor(private readonly commandBus: CommandBus) {}

  /**
   * `POST /auth/register` — регистрация нового пользователя.
   * @returns Пара токенов и публичные данные пользователя ({@link AuthResult}).
   */
  @Post('register')
  @ApiOperation({ summary: 'Регистрация нового пользователя' })
  @ApiCreatedResponse({ description: 'Пользователь создан, выпущена пара токенов', type: AuthResponse })
  @ApiConflictResponse({ description: 'Email уже используется', type: ApiErrorResponse })
  register(@Body() dto: RegisterDto) {
    return this.commandBus.execute(new RegisterCommand(dto.name, dto.email, dto.password));
  }

  /**
   * `POST /auth/login` — вход по email и паролю.
   * @returns Пара токенов и публичные данные пользователя ({@link AuthResult}).
   */
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Вход по email и паролю' })
  @ApiOkResponse({ description: 'Успешный вход, выпущена пара токенов', type: AuthResponse })
  @ApiUnauthorizedResponse({ description: 'Неверный email или пароль', type: ApiErrorResponse })
  login(@Body() dto: LoginDto) {
    return this.commandBus.execute(new LoginCommand(dto.email, dto.password));
  }

  /**
   * `POST /auth/refresh` — обновление пары токенов по refresh-токену (с ротацией).
   * @returns Новая пара токенов ({@link AuthResult}).
   */
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Обновление пары токенов по refresh-токену (с ротацией)' })
  @ApiOkResponse({ description: 'Выпущена новая пара токенов', type: AuthResponse })
  @ApiUnauthorizedResponse({ description: 'Refresh-токен недействителен или отозван', type: ApiErrorResponse })
  refresh(@Body() dto: RefreshDto) {
    return this.commandBus.execute(new RefreshTokenCommand(dto.refreshToken));
  }

  /**
   * `POST /auth/logout` — отзыв переданного refresh-токена.
   * Идемпотентен: невалидный/уже отозванный токен не считается ошибкой.
   */
  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Выход: отзыв refresh-токена (идемпотентно)' })
  @ApiNoContentResponse({ description: 'Токен отозван (или уже был недействителен)' })
  logout(@Body() dto: RefreshDto) {
    return this.commandBus.execute(new LogoutCommand(dto.refreshToken));
  }
}
