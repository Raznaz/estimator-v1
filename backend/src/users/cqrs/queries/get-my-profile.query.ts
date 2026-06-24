import { NotFoundException } from '@nestjs/common';
import { QueryHandler, IQueryHandler } from '@nestjs/cqrs';
import { toPublicUser, UserRepository } from '../../repository/user.repository';
import type { User as PublicUser } from '../../../shared';

/** Получить публичный профиль текущего пользователя (бросает, если не найден) */
export class GetMyProfileQuery {
  constructor(public readonly userId: string) {}
}

@QueryHandler(GetMyProfileQuery)
export class GetMyProfileHandler implements IQueryHandler<GetMyProfileQuery, PublicUser> {
  constructor(private readonly users: UserRepository) {}

  async execute(query: GetMyProfileQuery): Promise<PublicUser> {
    const user = await this.users.findById(query.userId);
    if (!user) {
      throw new NotFoundException('Пользователь не найден');
    }
    return toPublicUser(user);
  }
}
