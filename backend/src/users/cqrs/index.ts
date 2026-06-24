import { CreateUserHandler } from './commands/create-user.command';
import { CreateGuestUserHandler } from './commands/create-guest-user.command';
import { UpdateProfileHandler } from './commands/update-profile.command';
import { ChangePasswordHandler } from './commands/change-password.command';
import { SetAvatarHandler } from './commands/set-avatar.command';
import { GetUserByIdHandler } from './queries/get-user-by-id.query';
import { GetUserByEmailHandler } from './queries/get-user-by-email.query';
import { GetMyProfileHandler } from './queries/get-my-profile.query';
import { GetAvatarPresetsHandler } from './queries/get-avatar-presets.query';

// Публичный контракт модуля users — команды и запросы для других модулей
export * from './commands/create-user.command';
export * from './commands/create-guest-user.command';
export * from './commands/update-profile.command';
export * from './commands/change-password.command';
export * from './commands/set-avatar.command';
export * from './queries/get-user-by-id.query';
export * from './queries/get-user-by-email.query';
export * from './queries/get-my-profile.query';
export * from './queries/get-avatar-presets.query';

/** Все CQRS-хендлеры модуля users (регистрируются как провайдеры) */
export const USERS_HANDLERS = [
  CreateUserHandler,
  CreateGuestUserHandler,
  UpdateProfileHandler,
  ChangePasswordHandler,
  SetAvatarHandler,
  GetUserByIdHandler,
  GetUserByEmailHandler,
  GetMyProfileHandler,
  GetAvatarPresetsHandler,
];
