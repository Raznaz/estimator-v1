import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { UserRepository } from './repository/user.repository';
import { UsersController } from './users.controller';
import { USERS_HANDLERS } from './cqrs';

@Module({
  imports: [CqrsModule],
  controllers: [UsersController],
  providers: [UserRepository, ...USERS_HANDLERS],
  exports: [UserRepository],
})
export class UsersModule {}
