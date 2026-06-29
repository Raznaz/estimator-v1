import { UnauthorizedException } from '@nestjs/common';
import { CommandHandler, ICommandHandler, QueryBus } from '@nestjs/cqrs';
import type { User as PrismaUser } from '@prisma/client';
import { verifyPassword } from '../../../users/lib/password';
import { toPublicUser } from '../../../users/repository/user.repository';
import { GetUserByEmailQuery } from '../../../users/cqrs';
import { AuthTokensService, type AuthResult } from '../../auth-tokens.service';

/** Логин по email и паролю */
export class LoginCommand {
  constructor(
    public readonly email: string,
    public readonly password: string,
  ) {}
}

/**
 * Проверяет email/пароль и выпускает пару токенов.
 * @throws UnauthorizedException При неверном email или пароле.
 */
@CommandHandler(LoginCommand)
export class LoginHandler implements ICommandHandler<LoginCommand, AuthResult> {
  constructor(
    private readonly queryBus: QueryBus,
    private readonly tokens: AuthTokensService,
  ) {}

  async execute(command: LoginCommand): Promise<AuthResult> {
    const user = await this.queryBus.execute<GetUserByEmailQuery, PrismaUser | null>(
      new GetUserByEmailQuery(command.email),
    );
    if (!user || !user.passwordHash) {
      throw new UnauthorizedException('Неверный email или пароль');
    }

    const valid = await verifyPassword(command.password, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedException('Неверный email или пароль');
    }

    return this.tokens.issueTokens(toPublicUser(user));
  }
}
