import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { UserRepository } from './repository/user.repository';
import { UsersController } from './users.controller';
import { USERS_HANDLERS } from './cqrs';

/**
 * Модуль пользователей: профиль, смена пароля, аватары и создание (в т.ч. гостей).
 * Экспортирует {@link UserRepository}; команды/запросы доступны другим модулям
 * через CQRS-шину (используются, например, в `auth`).
 */
@Module({
  imports: [CqrsModule],
  controllers: [UsersController],
  providers: [UserRepository, ...USERS_HANDLERS],
  exports: [UserRepository],
})
export class UsersModule {}
