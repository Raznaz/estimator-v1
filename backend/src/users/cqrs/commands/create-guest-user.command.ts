import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import type { User as PrismaUser } from '@prisma/client';
import { UserRepository } from '../../repository/user.repository';

/** Создать анонимного пользователя (гостя) без email и пароля — для входа в комнату */
export class CreateGuestUserCommand {
  constructor(public readonly name: string) {}
}

/** Создаёт гостя — пользователя только с именем, без email и пароля. */
@CommandHandler(CreateGuestUserCommand)
export class CreateGuestUserHandler
  implements ICommandHandler<CreateGuestUserCommand, PrismaUser>
{
  constructor(private readonly users: UserRepository) {}

  execute(command: CreateGuestUserCommand): Promise<PrismaUser> {
    return this.users.create({ name: command.name });
  }
}
