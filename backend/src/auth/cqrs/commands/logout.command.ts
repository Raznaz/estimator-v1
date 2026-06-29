import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { AuthTokensService } from '../../auth-tokens.service';

/** Выход: отзыв переданного refresh-токена */
export class LogoutCommand {
  constructor(public readonly refreshToken: string) {}
}

/** Идемпотентно отзывает refresh-токен; невалидный токен молча игнорируется. */
@CommandHandler(LogoutCommand)
export class LogoutHandler implements ICommandHandler<LogoutCommand, void> {
  constructor(private readonly tokens: AuthTokensService) {}

  async execute(command: LogoutCommand): Promise<void> {
    try {
      const { tokenId } = await this.tokens.verifyRefreshToken(command.refreshToken);
      await this.tokens.revokeToken(tokenId);
    } catch {
      // Идемпотентный logout: невалидный/уже отозванный токен — не ошибка
    }
  }
}
