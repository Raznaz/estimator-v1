import { Injectable } from '@nestjs/common';
import type { RefreshToken } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

/** Доступ к таблице refresh-токенов (хранятся SHA-256-хеши, см. `AuthTokensService`). */
@Injectable()
export class RefreshTokenRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** Сохранить запись refresh-токена (хеш + срок жизни). */
  create(data: { userId: string; tokenHash: string; expiresAt: Date }): Promise<RefreshToken> {
    return this.prisma.refreshToken.create({ data });
  }

  /** Активные (не истёкшие) refresh-токены пользователя */
  findActiveByUser(userId: string): Promise<RefreshToken[]> {
    return this.prisma.refreshToken.findMany({
      where: { userId, expiresAt: { gt: new Date() } },
    });
  }

  /** Удалить один токен по id (ротация/logout). */
  deleteById(id: string): Promise<RefreshToken> {
    return this.prisma.refreshToken.delete({ where: { id } });
  }

  /** Отозвать все токены пользователя (например, при смене пароля). */
  deleteAllForUser(userId: string): Promise<{ count: number }> {
    return this.prisma.refreshToken.deleteMany({ where: { userId } });
  }
}
