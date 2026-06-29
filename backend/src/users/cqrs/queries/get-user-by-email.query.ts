import { QueryHandler, IQueryHandler } from '@nestjs/cqrs';
import type { User as PrismaUser } from '@prisma/client';
import { UserRepository } from '../../repository/user.repository';

/**
 * Получить пользователя по email вместе с passwordHash.
 * Предназначен только для модуля auth (логин/проверка уникальности).
 */
export class GetUserByEmailQuery {
  constructor(public readonly email: string) {}
}

/**
 * Возвращает Prisma-пользователя (с `passwordHash`) по email или `null`.
 * Не приводит к публичному виду — рассчитан на внутреннее использование в `auth`.
 */
@QueryHandler(GetUserByEmailQuery)
export class GetUserByEmailHandler
  implements IQueryHandler<GetUserByEmailQuery, PrismaUser | null>
{
  constructor(private readonly users: UserRepository) {}

  execute(query: GetUserByEmailQuery): Promise<PrismaUser | null> {
    return this.users.findByEmail(query.email);
  }
}
