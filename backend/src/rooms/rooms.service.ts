import { Injectable, NotFoundException } from '@nestjs/common';
import type { Room as PrismaRoom } from '@prisma/client';
import { randomInt } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';
import type { Room as PublicRoom, ScaleType } from '../shared';

/** Алфавит кода комнаты без визуально схожих символов (0/O, 1/I). */
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const CODE_LENGTH = 6;

export interface CreateRoomData {
  ownerId: string;
  name?: string;
  scaleType?: ScaleType;
}

@Injectable()
export class RoomsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Сгенерировать случайный код фиксированной длины. */
  private generateCode(): string {
    let code = '';
    for (let i = 0; i < CODE_LENGTH; i += 1) {
      code += CODE_ALPHABET[randomInt(CODE_ALPHABET.length)];
    }
    return code;
  }

  /** Сгенерировать уникальный (свободный в БД) код комнаты. */
  private async generateUniqueCode(): Promise<string> {
    // Коллизии крайне маловероятны, но на всякий случай повторяем.
    for (let attempt = 0; attempt < 10; attempt += 1) {
      const code = this.generateCode();
      const existing = await this.prisma.room.findUnique({ where: { code } });
      if (!existing) return code;
    }
    throw new Error('Не удалось сгенерировать уникальный код комнаты');
  }

  /** Создать комнату с уникальным кодом. */
  async create(data: CreateRoomData): Promise<PrismaRoom> {
    const code = await this.generateUniqueCode();
    return this.prisma.room.create({
      data: {
        code,
        name: data.name?.trim() || `Комната ${code}`,
        scaleType: data.scaleType ?? 'FIBONACCI',
        ownerId: data.ownerId,
      },
    });
  }

  /** Найти активную комнату по коду (404, если нет или закрыта). */
  async findByCode(code: string): Promise<PrismaRoom> {
    const room = await this.prisma.room.findUnique({ where: { code } });
    if (!room || room.status === 'CLOSED') {
      throw new NotFoundException('Комната не найдена');
    }
    return room;
  }
}

/** Привести Prisma-комнату к публичному виду (даты — ISO-строки). */
export function toPublicRoom(room: PrismaRoom): PublicRoom {
  return {
    id: room.id,
    name: room.name,
    code: room.code,
    ownerId: room.ownerId,
    scaleType: room.scaleType,
    status: room.status,
    createdAt: room.createdAt.toISOString(),
  };
}
