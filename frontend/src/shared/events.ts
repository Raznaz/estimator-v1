/**
 * Контракт WebSocket-событий между frontend (клиент) и backend (Socket.IO gateway).
 * Имена событий и payload'ы используются обеими сторонами.
 *
 * ВНИМАНИЕ: этот файл дублируется в frontend/src/shared/events.ts —
 * держи обе копии синхронными.
 */

import type { ParticipantRole, ParticipantView, PublicVote, Room, Round, Ticket } from './types';

/** События, которые клиент отправляет на сервер */
export const ClientEvents = {
  JOIN_ROOM: 'room:join',
  LEAVE_ROOM: 'room:leave',
  CAST_VOTE: 'vote:cast',
  REVEAL_ROUND: 'round:reveal',
  RESET_ROUND: 'round:reset',
  SELECT_TICKET: 'ticket:select',
  CREATE_TICKET: 'ticket:create',
} as const;

/** События, которые сервер шлёт клиентам */
export const ServerEvents = {
  ROOM_STATE: 'room:state',
  PARTICIPANT_JOINED: 'participant:joined',
  PARTICIPANT_LEFT: 'participant:left',
  VOTE_UPDATED: 'vote:updated',
  ROUND_REVEALED: 'round:revealed',
  ROUND_RESET: 'round:reset',
  ERROR: 'error',
} as const;

// --- Payload'ы клиентских событий ---

export interface JoinRoomPayload {
  roomCode: string;
  userName: string;
  role?: ParticipantRole;
  /** JWT access-токен зарегистрированного пользователя (для гостей не передаётся) */
  token?: string;
}

export interface CastVotePayload {
  roundId: string;
  value: string;
}

export interface RevealRoundPayload {
  roundId: string;
}

export interface ResetRoundPayload {
  ticketId: string;
}

export interface SelectTicketPayload {
  ticketId: string;
}

/** Создание тикета. Комната определяется по сокет-сессии (где участник состоит). */
export interface CreateTicketPayload {
  title?: string;
}

// --- Payload'ы серверных событий ---

/** Полное состояние комнаты — отправляется при входе и значимых изменениях */
export interface RoomStatePayload {
  room: Room;
  participants: ParticipantView[];
  tickets: Ticket[];
  activeTicketId: string | null;
  currentRound: Round | null;
  votes: PublicVote[];
}

export interface VoteUpdatedPayload {
  roundId: string;
  votes: PublicVote[];
}

export interface RoundRevealedPayload {
  roundId: string;
  votes: PublicVote[];
}

export interface ErrorPayload {
  message: string;
  code?: string;
}
