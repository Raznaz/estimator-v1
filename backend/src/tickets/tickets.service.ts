import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TicketsService {
  constructor(private readonly prisma: PrismaService) {}

  // TODO: добавить тикет в комнату (с порядком order)
  // TODO: список тикетов комнаты
  // TODO: установить финальную оценку (finalEstimate) и статус ESTIMATED
  // TODO: пропустить тикет (status = SKIPPED)
}
