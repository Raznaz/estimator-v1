import { NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import type { User as PublicUser } from '../../../shared';
import { toPublicUser, UserRepository } from '../../repository/user.repository';

/** Установить аватар пользователя (после загрузки файла или выбора пресета) */
export class SetAvatarCommand {
  constructor(
    public readonly userId: string,
    public readonly avatarUrl: string,
  ) {}
}

/**
 * Проставляет URL аватара пользователю.
 * @throws NotFoundException Если пользователь не найден.
 */
@CommandHandler(SetAvatarCommand)
export class SetAvatarHandler implements ICommandHandler<SetAvatarCommand, PublicUser> {
  constructor(private readonly users: UserRepository) {}

  async execute(command: SetAvatarCommand): Promise<PublicUser> {
    const existing = await this.users.findById(command.userId);
    if (!existing) {
      throw new NotFoundException('Пользователь не найден');
    }
    const updated = await this.users.update(command.userId, { avatarUrl: command.avatarUrl });
    return toPublicUser(updated);
  }
}
