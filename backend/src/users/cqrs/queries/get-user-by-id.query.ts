import { QueryHandler, IQueryHandler } from '@nestjs/cqrs';
import { toPublicUser, UserRepository } from '../../repository/user.repository';
import type { User as PublicUser } from '../../../shared';

/** Получить публичный профиль пользователя по id (null, если не найден) */
export class GetUserByIdQuery {
  constructor(public readonly userId: string) {}
}

/** Возвращает публичный профиль по id или `null`, если пользователь не найден. */
@QueryHandler(GetUserByIdQuery)
export class GetUserByIdHandler
  implements IQueryHandler<GetUserByIdQuery, PublicUser | null>
{
  constructor(private readonly users: UserRepository) {}

  async execute(query: GetUserByIdQuery): Promise<PublicUser | null> {
    const user = await this.users.findById(query.userId);
    return user ? toPublicUser(user) : null;
  }
}
