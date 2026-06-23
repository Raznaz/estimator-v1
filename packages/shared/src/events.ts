/**
 * Контракт WebSocket-событий между web (клиент) и api (Socket.IO gateway).
 * Имена событий и payload'ы используются обеими сторонами.
 */

import type { ParticipantRole, PublicVote, Room, Round, Ticket } from './types.js';

/** События, которые клиент отправляет на сервер */
export const ClientEvents = {
  JOIN_ROOM: 'room:join',
  LEAVE_ROOM: 'room:leave',
  CAST_VOTE: 'vote:cast',
  REVEAL_ROUND: 'round:reveal',
  RESET_ROUND: 'round:reset',
  SELECT_TICKET: 'ticket:select',
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

// --- Payload'ы серверных событий ---

/** Полное состояние комнаты — отправляется при входе и значимых изменениях */
export interface RoomStatePayload {
  room: Room;
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
