import { Injectable } from '@nestjs/common';
import type { User as PrismaUser } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import type { User as PublicUser } from '../../shared';

export interface CreateUserData {
  name: string;
  email?: string | null;
  passwordHash?: string | null;
  avatarUrl?: string | null;
}

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

  create(data: CreateUserData): Promise<PrismaUser> {
    return this.prisma.user.create({ data });
  }

  findById(id: string): Promise<PrismaUser | null> {
    return this.prisma.user.findUnique({ where: { id } });
  }

  findByEmail(email: string): Promise<PrismaUser | null> {
    return this.prisma.user.findUnique({ where: { email } });
  }

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
