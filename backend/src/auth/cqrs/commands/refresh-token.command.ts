import { UnauthorizedException } from '@nestjs/common';
import { CommandHandler, ICommandHandler, QueryBus } from '@nestjs/cqrs';
import { GetUserByIdQuery } from '../../../users/cqrs';
import type { User as PublicUser } from '../../../shared';
import { AuthTokensService, type AuthResult } from '../../auth-tokens.service';

/** Обновление пары токенов по refresh-токену (с ротацией) */
export class RefreshTokenCommand {
  constructor(public readonly refreshToken: string) {}
}

@CommandHandler(RefreshTokenCommand)
export class RefreshTokenHandler implements ICommandHandler<RefreshTokenCommand, AuthResult> {
  constructor(
    private readonly queryBus: QueryBus,
    private readonly tokens: AuthTokensService,
  ) {}

  async execute(command: RefreshTokenCommand): Promise<AuthResult> {
    const { userId, tokenId } = await this.tokens.verifyRefreshToken(command.refreshToken);

    // Ротация: старый refresh больше недействителен
    await this.tokens.revokeToken(tokenId);

    const user = await this.queryBus.execute<GetUserByIdQuery, PublicUser | null>(
      new GetUserByIdQuery(userId),
    );
    if (!user) {
      throw new UnauthorizedException('Пользователь не найден');
    }

    return this.tokens.issueTokens(user);
  }
}
