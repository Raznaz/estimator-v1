import { ConflictException } from '@nestjs/common';
import { CommandBus, CommandHandler, ICommandHandler, QueryBus } from '@nestjs/cqrs';
import type { User as PrismaUser } from '@prisma/client';
import { hashPassword } from '../../../users/lib/password';
import { toPublicUser } from '../../../users/repository/user.repository';
import { CreateUserCommand, GetUserByEmailQuery } from '../../../users/cqrs';
import { AuthTokensService, type AuthResult } from '../../auth-tokens.service';

/** Регистрация нового пользователя */
export class RegisterCommand {
  constructor(
    public readonly name: string,
    public readonly email: string,
    public readonly password: string,
  ) {}
}

@CommandHandler(RegisterCommand)
export class RegisterHandler implements ICommandHandler<RegisterCommand, AuthResult> {
  constructor(
    private readonly queryBus: QueryBus,
    private readonly commandBus: CommandBus,
    private readonly tokens: AuthTokensService,
  ) {}

  async execute(command: RegisterCommand): Promise<AuthResult> {
    const existing = await this.queryBus.execute<GetUserByEmailQuery, PrismaUser | null>(
      new GetUserByEmailQuery(command.email),
    );
    if (existing) {
      throw new ConflictException('Email уже используется');
    }

    const passwordHash = await hashPassword(command.password);
    const user = await this.commandBus.execute<CreateUserCommand, PrismaUser>(
      new CreateUserCommand(command.name, command.email, passwordHash),
    );

    return this.tokens.issueTokens(toPublicUser(user));
  }
}
