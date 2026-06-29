import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { LoginCommand, LogoutCommand, RefreshTokenCommand, RegisterCommand } from './cqrs';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';
import { RegisterDto } from './dto/register.dto';

/**
 * REST-эндпоинты аутентификации (`/auth`).
 * Контроллер только валидирует DTO и делегирует работу CQRS-хендлерам через `CommandBus`.
 */
@Controller('auth')
export class AuthController {
  constructor(private readonly commandBus: CommandBus) {}

  /**
   * `POST /auth/register` — регистрация нового пользователя.
   * @returns Пара токенов и публичные данные пользователя ({@link AuthResult}).
   */
  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.commandBus.execute(new RegisterCommand(dto.name, dto.email, dto.password));
  }

  /**
   * `POST /auth/login` — вход по email и паролю.
   * @returns Пара токенов и публичные данные пользователя ({@link AuthResult}).
   */
  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(@Body() dto: LoginDto) {
    return this.commandBus.execute(new LoginCommand(dto.email, dto.password));
  }

  /**
   * `POST /auth/refresh` — обновление пары токенов по refresh-токену (с ротацией).
   * @returns Новая пара токенов ({@link AuthResult}).
   */
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  refresh(@Body() dto: RefreshDto) {
    return this.commandBus.execute(new RefreshTokenCommand(dto.refreshToken));
  }

  /**
   * `POST /auth/logout` — отзыв переданного refresh-токена.
   * Идемпотентен: невалидный/уже отозванный токен не считается ошибкой.
   */
  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  logout(@Body() dto: RefreshDto) {
    return this.commandBus.execute(new LogoutCommand(dto.refreshToken));
  }
}
