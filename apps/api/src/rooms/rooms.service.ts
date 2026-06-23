import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class RoomsService {
  constructor(private readonly prisma: PrismaService) {}

  // TODO: реализовать создание комнаты с генерацией уникального кода
  // create(dto: CreateRoomDto) { ... }

  // TODO: найти комнату по коду со списком тикетов и участников
  // findByCode(code: string) { ... }

  // TODO: закрыть комнату (status = CLOSED)
}
