import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { AuthModule } from '../auth/auth.module';
import { RoomsController } from './rooms.controller';
import { RoomsService } from './rooms.service';

/**
 * Модуль комнат: создание комнаты (в т.ч. гостём-владельцем) и поиск по коду.
 * Импортирует `AuthModule` ради {@link AuthTokensService} (проверка/выпуск токенов
 * при создании комнаты) и экспортирует {@link RoomsService} для других модулей.
 */
@Module({
  imports: [CqrsModule, AuthModule],
  controllers: [RoomsController],
  providers: [RoomsService],
  exports: [RoomsService],
})
export class RoomsModule {}
