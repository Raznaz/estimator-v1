import { BadRequestException, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { hashPassword, verifyPassword } from '../../lib/password';
import { UserRepository } from '../../repository/user.repository';

/** Сменить пароль зарегистрированного пользователя */
export class ChangePasswordCommand {
  constructor(
    public readonly userId: string,
    public readonly oldPassword: string,
    public readonly newPassword: string,
  ) {}
}

/**
 * Меняет пароль после проверки текущего.
 * @throws NotFoundException Если пользователь не найден.
 * @throws BadRequestException Если у пользователя не задан пароль (например, гость).
 * @throws UnauthorizedException Если текущий пароль неверен.
 */
@CommandHandler(ChangePasswordCommand)
export class ChangePasswordHandler implements ICommandHandler<ChangePasswordCommand, void> {
  constructor(private readonly users: UserRepository) {}

  async execute(command: ChangePasswordCommand): Promise<void> {
    const user = await this.users.findById(command.userId);
    if (!user) {
      throw new NotFoundException('Пользователь не найден');
    }
    if (!user.passwordHash) {
      throw new BadRequestException('У пользователя не задан пароль');
    }

    const valid = await verifyPassword(command.oldPassword, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedException('Неверный текущий пароль');
    }

    const passwordHash = await hashPassword(command.newPassword);
    await this.users.update(command.userId, { passwordHash });
  }
}
