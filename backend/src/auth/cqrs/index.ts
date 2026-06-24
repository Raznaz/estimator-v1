import { RegisterHandler } from './commands/register.command';
import { LoginHandler } from './commands/login.command';
import { RefreshTokenHandler } from './commands/refresh-token.command';
import { LogoutHandler } from './commands/logout.command';

export * from './commands/register.command';
export * from './commands/login.command';
export * from './commands/refresh-token.command';
export * from './commands/logout.command';

/** Все CQRS-хендлеры модуля auth */
export const AUTH_HANDLERS = [
  RegisterHandler,
  LoginHandler,
  RefreshTokenHandler,
  LogoutHandler,
];
