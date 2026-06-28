'use client';

import { useEffect, useMemo, useState } from 'react';
import { getSocket } from '@/lib/socket';
import { getAccessToken } from '@/lib/auth-storage';
import { getDisplayName, setDisplayName } from '@/lib/room-session';
import {
  ClientEvents,
  SCALES,
  ServerEvents,
  type ParticipantView,
  type RoomStatePayload,
} from '@/shared';
import styles from './page.module.css';

interface SelfInfo {
  participantId: string;
  userId: string;
}

export default function RoomClient({ code }: { code: string }) {
  const [name, setName] = useState<string | null>(null);
  const [nameChecked, setNameChecked] = useState(false);
  const [nameInput, setNameInput] = useState('');

  const [state, setState] = useState<RoomStatePayload | null>(null);
  const [self, setSelf] = useState<SelfInfo | null>(null);
  const [myVote, setMyVote] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [newTitle, setNewTitle] = useState('');

  // Определяем отображаемое имя из localStorage (или ждём ввода в гейте).
  useEffect(() => {
    setName(getDisplayName());
    setNameChecked(true);
  }, []);

  // Подключение к комнате и подписка на состояние.
  useEffect(() => {
    if (!name) return;
    const socket = getSocket();

    const onState = (s: RoomStatePayload) => setState(s);
    const onError = (e: { message: string }) => setError(e.message);

    socket.on(ServerEvents.ROOM_STATE, onState);
    socket.on(ServerEvents.ERROR, onError);
    if (!socket.connected) socket.connect();

    const token = getAccessToken() ?? undefined;
    socket.emit(
      ClientEvents.JOIN_ROOM,
      { roomCode: code, userName: name, token },
      (ack?: SelfInfo) => {
        if (ack?.participantId) setSelf(ack);
      },
    );

    return () => {
      socket.off(ServerEvents.ROOM_STATE, onState);
      socket.off(ServerEvents.ERROR, onError);
      socket.disconnect();
    };
  }, [name, code]);

  // Сбрасываем локально выбранную карту при смене раунда.
  const roundId = state?.currentRound?.id ?? null;
  useEffect(() => {
    setMyVote(null);
  }, [roundId]);

  const me = useMemo(
    () => state?.participants.find((p) => p.id === self?.participantId) ?? null,
    [state, self],
  );
  const isOwner = me?.isOwner ?? false;
  const deck = state ? SCALES[state.room.scaleType] : [];
  const currentRound = state?.currentRound ?? null;
  const revealed = currentRound?.status === 'REVEALED';
  const activeTicket = state?.tickets.find((t) => t.id === state.activeTicketId) ?? null;

  const voteValueByParticipant = useMemo(() => {
    const map = new Map<string, string>();
    state?.votes.forEach((v) => {
      if (v.value !== undefined) map.set(v.participantId, v.value);
    });
    return map;
  }, [state]);

  const average = useMemo(() => {
    if (!revealed) return null;
    const nums = (state?.votes ?? [])
      .map((v) => v.value)
      .filter((v): v is string => v !== undefined && v.trim() !== '' && !Number.isNaN(Number(v)))
      .map(Number);
    if (nums.length === 0) return null;
    return (nums.reduce((a, b) => a + b, 0) / nums.length).toFixed(1);
  }, [revealed, state]);

  function handleNameSubmit(e: React.FormEvent) {
    e.preventDefault();
    const value = nameInput.trim();
    if (!value) return;
    setDisplayName(value);
    setName(value);
  }

  function castVote(value: string) {
    if (!currentRound || revealed) return;
    setMyVote(value);
    getSocket().emit(ClientEvents.CAST_VOTE, { roundId: currentRound.id, value });
  }

  function createTicket(e: React.FormEvent) {
    e.preventDefault();
    getSocket().emit(ClientEvents.CREATE_TICKET, { title: newTitle.trim() || undefined });
    setNewTitle('');
  }

  function selectTicket(ticketId: string) {
    if (!isOwner) return;
    getSocket().emit(ClientEvents.SELECT_TICKET, { ticketId });
  }

  function reveal() {
    if (currentRound) getSocket().emit(ClientEvents.REVEAL_ROUND, { roundId: currentRound.id });
  }

  function resetRound() {
    if (activeTicket) getSocket().emit(ClientEvents.RESET_ROUND, { ticketId: activeTicket.id });
  }

  async function copyInvite() {
    const url = `${window.location.origin}/room/${code}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setError('Не удалось скопировать ссылку');
    }
  }

  // Гейт имени для входа по ссылке-приглашению.
  if (nameChecked && !name) {
    return (
      <form className={styles.gate} onSubmit={handleNameSubmit}>
        <h2 className={styles.gateTitle}>Вход в комнату {code}</h2>
        <label className={styles.label}>
          Ваше имя
          <input
            className={styles.input}
            value={nameInput}
            onChange={(e) => setNameInput(e.target.value)}
            placeholder="Например, Борис"
            maxLength={60}
            autoFocus
            required
          />
        </label>
        <button className={styles.button} type="submit">
          Войти
        </button>
      </form>
    );
  }

  return (
    <div>
      <div className={styles.topbar}>
        <div>
          <span className={styles.roomLabel}>Комната</span>{' '}
          <strong className={styles.roomCode}>{code}</strong>
          {state && <span className={styles.roomName}> · {state.room.name}</span>}
        </div>
        <button className={styles.inviteButton} onClick={copyInvite} type="button">
          🔗 {copied ? 'Ссылка скопирована!' : 'Скопировать ссылку приглашения'}
        </button>
      </div>

      {error && <p className={styles.errorBanner}>{error}</p>}

      <div className={styles.room}>
        <div className={styles.board}>
          <section className={styles.ticketsPanel}>
            <div className={styles.ticketsHeader}>
              <h3 className={styles.panelTitle}>Задачи</h3>
            </div>
            {isOwner && (
              <form className={styles.newTicketForm} onSubmit={createTicket}>
                <input
                  className={styles.input}
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Название задачи (необязательно)"
                  maxLength={120}
                />
                <button className={styles.smallButton} type="submit">
                  Новая
                </button>
              </form>
            )}
            <ul className={styles.ticketList}>
              {state?.tickets.length === 0 && (
                <li className={styles.empty}>Пока нет задач</li>
              )}
              {state?.tickets.map((ticket) => {
                const isActive = ticket.id === state.activeTicketId;
                return (
                  <li
                    key={ticket.id}
                    className={`${styles.ticketItem} ${isActive ? styles.ticketActive : ''} ${
                      isOwner ? styles.ticketClickable : ''
                    }`}
                    onClick={() => selectTicket(ticket.id)}
                  >
                    <span className={styles.ticketTitle}>{ticket.title}</span>
                    {ticket.finalEstimate && (
                      <span className={styles.ticketEstimate}>{ticket.finalEstimate}</span>
                    )}
                    {isActive && <span className={styles.ticketBadge}>на оценке</span>}
                  </li>
                );
              })}
            </ul>
          </section>

          <section className={styles.votePanel}>
            {activeTicket ? (
              <>
                <h3 className={styles.panelTitle}>{activeTicket.title}</h3>
                {!revealed ? (
                  <>
                    <p className={styles.hint}>Выберите карту:</p>
                    <div className={styles.cards}>
                      {deck.map((card) => (
                        <button
                          key={card}
                          type="button"
                          className={`${styles.cardButton} ${
                            myVote === card ? styles.cardSelected : ''
                          }`}
                          onClick={() => castVote(card)}
                        >
                          {card}
                        </button>
                      ))}
                    </div>
                    {isOwner && (
                      <button className={styles.actionButton} type="button" onClick={reveal}>
                        Раскрыть голоса
                      </button>
                    )}
                  </>
                ) : (
                  <div className={styles.results}>
                    <p className={styles.resultLine}>
                      Среднее: <strong>{average ?? '—'}</strong>
                    </p>
                    {isOwner && (
                      <button className={styles.actionButton} type="button" onClick={resetRound}>
                        Переголосовать
                      </button>
                    )}
                  </div>
                )}
              </>
            ) : (
              <p className={styles.empty}>
                {isOwner
                  ? 'Выберите задачу из списка, чтобы начать голосование.'
                  : 'Ожидаем, когда владелец выберет задачу для оценки.'}
              </p>
            )}
          </section>
        </div>

        <aside className={styles.sidebar}>
          <h3 className={styles.panelTitle}>Участники ({state?.participants.length ?? 0})</h3>
          <ul className={styles.participantList}>
            {state?.participants.map((p) => (
              <ParticipantRow
                key={p.id}
                participant={p}
                isMe={p.id === self?.participantId}
                revealed={revealed}
                value={voteValueByParticipant.get(p.id)}
                votingActive={Boolean(currentRound) && !revealed}
              />
            ))}
          </ul>
        </aside>
      </div>
    </div>
  );
}

function ParticipantRow({
  participant,
  isMe,
  revealed,
  value,
  votingActive,
}: {
  participant: ParticipantView;
  isMe: boolean;
  revealed: boolean;
  value?: string;
  votingActive: boolean;
}) {
  let statusNode: React.ReactNode = null;
  if (revealed) {
    statusNode = <span className={styles.voteValue}>{value ?? '—'}</span>;
  } else if (votingActive) {
    statusNode = <span>{participant.hasVoted ? '✅' : '⏳'}</span>;
  }

  return (
    <li className={styles.participantRow}>
      <span className={styles.avatar}>{participant.name.charAt(0).toUpperCase()}</span>
      <span className={styles.participantName}>
        {participant.name}
        {isMe && <span className={styles.youBadge}> (вы)</span>}
      </span>
      {participant.isOwner && <span className={styles.ownerBadge}>владелец</span>}
      {statusNode}
    </li>
  );
}
