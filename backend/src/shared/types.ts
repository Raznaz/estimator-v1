/**
 * Доменные типы Planning Poker.
 * Зеркалят сущности Prisma-схемы, но независимы от Prisma Client.
 *
 * ВНИМАНИЕ: этот файл дублируется в frontend/src/shared/types.ts —
 * держи обе копии синхронными.
 */

import type { ScaleType } from './scales';

export type RoomStatus = 'ACTIVE' | 'CLOSED';
export type ParticipantRole = 'VOTER' | 'SPECTATOR';
export type TicketStatus = 'PENDING' | 'VOTING' | 'ESTIMATED' | 'SKIPPED';
export type RoundStatus = 'VOTING' | 'REVEALED';

export interface User {
  id: string;
  name: string;
  email?: string | null;
  /** URL аватара: пресет DiceBear или загруженный файл (/static/...) */
  avatarUrl?: string | null;
  createdAt: string;
}

export interface Room {
  id: string;
  name: string;
  /** Короткий код для входа в комнату */
  code: string;
  ownerId: string;
  scaleType: ScaleType;
  status: RoomStatus;
  createdAt: string;
}

export interface Participant {
  id: string;
  roomId: string;
  userId: string;
  role: ParticipantRole;
  joinedAt: string;
}

/**
 * Участник комнаты для отображения в UI: данные Participant, обогащённые
 * именем/аватаром пользователя и статусом голоса в текущем раунде.
 */
export interface ParticipantView {
  /** id записи Participant */
  id: string;
  userId: string;
  name: string;
  avatarUrl?: string | null;
  role: ParticipantRole;
  /** Является ли участник владельцем комнаты */
  isOwner: boolean;
  /** Проголосовал ли участник в текущем раунде */
  hasVoted: boolean;
}

export interface Ticket {
  id: string;
  roomId: string;
  title: string;
  /** Ключ внешней задачи, например JIRA-123 */
  externalKey?: string | null;
  description?: string | null;
  /** Финальная согласованная оценка */
  finalEstimate?: string | null;
  status: TicketStatus;
  /** Порядок в очереди тикетов комнаты */
  order: number;
}

export interface Round {
  id: string;
  ticketId: string;
  status: RoundStatus;
  startedAt: string;
  revealedAt?: string | null;
}

export interface Vote {
  id: string;
  roundId: string;
  participantId: string;
  /** Значение карты (строкой, см. shared/scales) */
  value: string;
  createdAt: string;
}

/** Голос с раскрытым значением (после reveal) или скрытый (во время голосования) */
export interface PublicVote {
  participantId: string;
  hasVoted: boolean;
  /** Заполнено только после раскрытия раунда */
  value?: string;
}
