import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import type { User as PrismaUser } from '@prisma/client';
import { UserRepository } from '../../repository/user.repository';

/** Создать пользователя (используется регистрацией и созданием гостей) */
export class CreateUserCommand {
  constructor(
    public readonly name: string,
    public readonly email?: string | null,
    public readonly passwordHash?: string | null,
    public readonly avatarUrl?: string | null,
  ) {}
}

/** Создаёт запись пользователя; отсутствующие поля сохраняются как `null`. */
@CommandHandler(CreateUserCommand)
export class CreateUserHandler implements ICommandHandler<CreateUserCommand, PrismaUser> {
  constructor(private readonly users: UserRepository) {}

  execute(command: CreateUserCommand): Promise<PrismaUser> {
    return this.users.create({
      name: command.name,
      email: command.email ?? null,
      passwordHash: command.passwordHash ?? null,
      avatarUrl: command.avatarUrl ?? null,
    });
  }
}
