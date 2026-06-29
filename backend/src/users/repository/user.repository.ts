import { Injectable } from '@nestjs/common';
import type { User as PrismaUser } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import type { User as PublicUser } from '../../shared';

/** Данные для создания пользователя; email/пароль необязательны (поддержка гостей). */
export interface CreateUserData {
  name: string;
  email?: string | null;
  passwordHash?: string | null;
  avatarUrl?: string | null;
}

/** Поля, доступные для частичного обновления пользователя. */
export interface UpdateUserData {
  name?: string;
  email?: string | null;
  avatarUrl?: string | null;
  passwordHash?: string;
}

/**
 * Тонкая обёртка над PrismaService для сущности User.
 * Переиспользуется хендлерами модуля users.
 */
@Injectable()
export class UserRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** Создать пользователя. */
  create(data: CreateUserData): Promise<PrismaUser> {
    return this.prisma.user.create({ data });
  }

  /** Найти пользователя по id (null, если не найден). */
  findById(id: string): Promise<PrismaUser | null> {
    return this.prisma.user.findUnique({ where: { id } });
  }

  /** Найти пользователя по email (null, если не найден). */
  findByEmail(email: string): Promise<PrismaUser | null> {
    return this.prisma.user.findUnique({ where: { email } });
  }

  /** Частично обновить пользователя по id. */
  update(id: string, data: UpdateUserData): Promise<PrismaUser> {
    return this.prisma.user.update({ where: { id }, data });
  }
}

/** Привести Prisma-пользователя к публичному виду (без passwordHash) */
export function toPublicUser(user: PrismaUser): PublicUser {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    avatarUrl: user.avatarUrl,
    createdAt: user.createdAt.toISOString(),
  };
}
