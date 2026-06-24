import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Бизнес-логика голосования: вход в комнату, приём голосов,
 * раскрытие и сброс раундов. Используется PokerGateway.
 */
@Injectable()
export class PokerService {
  constructor(private readonly prisma: PrismaService) {}

  // TODO: присоединить участника к комнате (создать User+Participant при необходимости)
  // TODO: открыть новый раунд по тикету (status = VOTING)
  // TODO: принять/обновить голос участника (upsert по roundId+participantId)
  // TODO: раскрыть раунд (status = REVEALED, revealedAt)
  // TODO: собрать публичное состояние голосов (скрытые / раскрытые)
}
