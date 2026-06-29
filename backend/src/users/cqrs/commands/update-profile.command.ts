import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { isPresetAvatar, type User as PublicUser } from '../../../shared';
import { toPublicUser, UserRepository } from '../../repository/user.repository';

/** Обновить профиль зарегистрированного пользователя */
export class UpdateProfileCommand {
  constructor(
    public readonly userId: string,
    public readonly name?: string,
    public readonly email?: string | null,
    public readonly avatarUrl?: string | null,
  ) {}
}

/**
 * Обновляет профиль: валидирует URL аватара и уникальность email.
 * @throws NotFoundException Если пользователь не найден.
 * @throws BadRequestException При недопустимом URL аватара.
 * @throws ConflictException Если email занят другим пользователем.
 */
@CommandHandler(UpdateProfileCommand)
export class UpdateProfileHandler
  implements ICommandHandler<UpdateProfileCommand, PublicUser>
{
  constructor(private readonly users: UserRepository) {}

  async execute(command: UpdateProfileCommand): Promise<PublicUser> {
    const existing = await this.users.findById(command.userId);
    if (!existing) {
      throw new NotFoundException('Пользователь не найден');
    }

    if (typeof command.avatarUrl === 'string' && !isValidAvatarUrl(command.avatarUrl)) {
      throw new BadRequestException('Недопустимый URL аватара');
    }

    if (command.email && command.email !== existing.email) {
      const taken = await this.users.findByEmail(command.email);
      if (taken && taken.id !== command.userId) {
        throw new ConflictException('Email уже используется');
      }
    }

    const updated = await this.users.update(command.userId, {
      name: command.name,
      email: command.email,
      avatarUrl: command.avatarUrl,
    });
    return toPublicUser(updated);
  }
}

/** Аватар допустим, если это пресет DiceBear или ранее загруженный файл */
function isValidAvatarUrl(url: string): boolean {
  return isPresetAvatar(url) || url.startsWith('/static/avatars/');
}
