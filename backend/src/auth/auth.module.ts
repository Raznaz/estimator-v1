import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { UsersModule } from '../users/users.module';
import { AuthController } from './auth.controller';
import { AuthTokensService } from './auth-tokens.service';
import { AUTH_HANDLERS } from './cqrs';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RefreshTokenRepository } from './repository/refresh-token.repository';
import { JwtStrategy } from './strategies/jwt.strategy';

/**
 * Модуль аутентификации: регистрация, вход, ротация и отзыв JWT-токенов.
 * Экспортирует {@link JwtAuthGuard} и {@link AuthTokensService} для других модулей
 * (например, для проверки токена при socket-handshake в `poker`).
 */
@Module({
  imports: [CqrsModule, UsersModule, PassportModule, JwtModule.register({})],
  controllers: [AuthController],
  providers: [
    AuthTokensService,
    RefreshTokenRepository,
    JwtStrategy,
    JwtAuthGuard,
    ...AUTH_HANDLERS,
  ],
  exports: [JwtAuthGuard, AuthTokensService],
})
export class AuthModule {}
