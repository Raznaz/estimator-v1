'use client';

import { useEffect, useMemo, useState } from 'react';
import { getSocket } from '@/lib/socket';
import { getAccessToken } from '@/lib/auth-storage';
import { getDisplayName, setDisplayName } from '@/lib/room-session';
import { resolveAvatarUrl } from '@/lib/avatar';
import { useRoomHeader } from '@/lib/room-header-context';
import {
  ClientEvents,
  SCALES,
  SPECIAL_CARDS,
  ServerEvents,
  type ParticipantRole,
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
  const [newTitle, setNewTitle] = useState('');

  const { setInfo } = useRoomHeader();

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

  // Прокидываем код/название комнаты в глобальный хедер (с кнопкой приглашения).
  const roomName = state?.room.name ?? null;
  useEffect(() => {
    setInfo({ code, name: roomName });
    return () => setInfo(null);
  }, [code, roomName, setInfo]);

  const me = useMemo(
    () => state?.participants.find((p) => p.id === self?.participantId) ?? null,
    [state, self],
  );
  const isOwner = me?.isOwner ?? false;
  const isSpectator = me?.role === 'SPECTATOR';
  const deck = state ? SCALES[state.room.scaleType] : [];
  const currentRound = state?.currentRound ?? null;
  const revealed = currentRound?.status === 'REVEALED';
  const activeTicket = state?.tickets.find((t) => t.id === state.activeTicketId) ?? null;
  const canVote = Boolean(currentRound) && !revealed && !isSpectator;

  // За столом сидят только голосующие; наблюдатели — только в списке справа.
  const voters = useMemo(
    () => state?.participants.filter((p) => p.role === 'VOTER') ?? [],
    [state],
  );

  // История — оценённые тикеты (со средним), кроме текущего активного.
  const history = useMemo(
    () =>
      state?.tickets.filter(
        (t) => t.finalEstimate != null && t.id !== state.activeTicketId,
      ) ?? [],
    [state],
  );

  const voteValueByParticipant = useMemo(() => {
    const map = new Map<string, string>();
    state?.votes.forEach((v) => {
      if (v.value !== undefined) map.set(v.participantId, v.value);
    });
    return map;
  }, [state]);

  function handleNameSubmit(e: React.FormEvent) {
    e.preventDefault();
    const value = nameInput.trim();
    if (!value) return;
    setDisplayName(value);
    setName(value);
  }

  function castVote(value: string) {
    if (!canVote || !currentRound) return;
    setMyVote(value);
    getSocket().emit(ClientEvents.CAST_VOTE, { roundId: currentRound.id, value });
  }

  function createTicket(e: React.FormEvent) {
    e.preventDefault();
    getSocket().emit(ClientEvents.CREATE_TICKET, { title: newTitle.trim() || undefined });
    setNewTitle('');
  }

  function reveal() {
    if (currentRound) getSocket().emit(ClientEvents.REVEAL_ROUND, { roundId: currentRound.id });
  }

  function resetRound() {
    if (activeTicket) getSocket().emit(ClientEvents.RESET_ROUND, { ticketId: activeTicket.id });
  }

  function toggleObserver() {
    const role: ParticipantRole = isSpectator ? 'VOTER' : 'SPECTATOR';
    getSocket().emit(ClientEvents.SET_ROLE, { role });
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
    <div className={styles.page}>
      {error && <p className={styles.errorBanner}>{error}</p>}

      <div className={styles.layout}>
        <main className={styles.stage}>
          <div className={styles.stageHeader}>
            {isOwner && (
              <form className={styles.newTicketForm} onSubmit={createTicket}>
                <input
                  className={styles.input}
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Название новой задачи (необязательно)"
                  maxLength={120}
                />
                <button className={styles.smallButton} type="submit">
                  Создать тикет
                </button>
              </form>
            )}

            {activeTicket ? (
              <div className={styles.activeInfo}>
                <h2 className={styles.activeTitle}>{activeTicket.title}</h2>
                <div className={styles.activeStatus}>
                  {revealed ? (
                    <span className={styles.average}>
                      Среднее: <strong>{activeTicket.finalEstimate ?? '—'}</strong>
                    </span>
                  ) : (
                    <span className={styles.statusVoting}>Идёт голосование…</span>
                  )}
                  {isOwner && !revealed && (
                    <button className={styles.actionButton} type="button" onClick={reveal}>
                      Раскрыть голоса
                    </button>
                  )}
                  {isOwner && revealed && (
                    <button className={styles.actionButton} type="button" onClick={resetRound}>
                      Переголосовать
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <p className={styles.empty}>
                {isOwner
                  ? 'Создайте задачу — голосование начнётся автоматически.'
                  : 'Ожидаем, когда владелец создаст задачу для оценки.'}
              </p>
            )}
          </div>

          <div className={styles.tableWrap}>
            <div className={styles.tableOval}>
              <span className={styles.tableLabel}>
                {voters.length > 0 ? `${voters.length} за столом` : 'Стол пуст'}
              </span>
            </div>
            {voters.map((p, i) => {
              const angle = (i / voters.length) * 2 * Math.PI - Math.PI / 2;
              const left = 50 + 44 * Math.cos(angle);
              const top = 50 + 44 * Math.sin(angle);
              const value = voteValueByParticipant.get(p.id);
              let chip: React.ReactNode = null;
              if (revealed) {
                chip = <span className={styles.seatValue}>{value ?? '—'}</span>;
              } else if (currentRound) {
                chip = <span className={styles.seatStatus}>{p.hasVoted ? '✅' : '⏳'}</span>;
              }
              return (
                <div
                  key={p.id}
                  className={styles.seat}
                  style={{ left: `${left}%`, top: `${top}%` }}
                >
                  <Avatar name={p.name} avatarUrl={p.avatarUrl} size={44} />
                  <span className={styles.seatName}>
                    {p.name}
                    {p.id === self?.participantId && ' (вы)'}
                  </span>
                  {chip}
                </div>
              );
            })}
          </div>

          <div className={styles.bottomBar}>
            <div className={styles.deck}>
              {deck.map((card) => {
                // Чашка кофе — это переключатель режима наблюдателя, а не голос.
                // Доступна всегда (даже вне голосования) и подсвечена для наблюдателя.
                if (card === SPECIAL_CARDS.COFFEE) {
                  return (
                    <button
                      key={card}
                      type="button"
                      className={`${styles.cardButton} ${styles.coffeeCard} ${
                        isSpectator ? styles.coffeeActive : ''
                      }`}
                      onClick={toggleObserver}
                      title="Режим наблюдателя"
                    >
                      ☕
                    </button>
                  );
                }
                return (
                  <button
                    key={card}
                    type="button"
                    disabled={!canVote}
                    className={`${styles.cardButton} ${canVote ? '' : styles.cardIdle} ${
                      myVote === card ? styles.cardSelected : ''
                    }`}
                    onClick={() => castVote(card)}
                  >
                    {card}
                  </button>
                );
              })}
            </div>
          </div>
        </main>

        <aside className={styles.sidebar}>
          <section className={styles.panel}>
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
          </section>

          <section className={styles.panel}>
            <h3 className={styles.panelTitle}>История</h3>
            {history.length === 0 ? (
              <p className={styles.empty}>Оценённых задач пока нет</p>
            ) : (
              <ul className={styles.historyList}>
                {history.map((t) => (
                  <li key={t.id} className={styles.historyItem}>
                    <span className={styles.historyTitle}>{t.title}</span>
                    <span className={styles.historyEstimate}>{t.finalEstimate}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
}

/** Аватар участника: картинка (пресет/загруженная) либо инициал-заглушка. */
function Avatar({
  name,
  avatarUrl,
  size,
}: {
  name: string;
  avatarUrl?: string | null;
  size: number;
}) {
  const url = resolveAvatarUrl(avatarUrl);
  const dimension = { width: size, height: size };
  if (url) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img className={styles.avatarImg} style={dimension} src={url} alt={name} />;
  }
  return (
    <span
      className={styles.avatarFallback}
      style={{ ...dimension, fontSize: size * 0.4 }}
    >
      {name.charAt(0).toUpperCase()}
    </span>
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
  const isSpectator = participant.role === 'SPECTATOR';
  let statusNode: React.ReactNode = null;
  if (isSpectator) {
    statusNode = <span className={styles.spectatorBadge}>наблюдатель</span>;
  } else if (revealed) {
    statusNode = <span className={styles.voteValue}>{value ?? '—'}</span>;
  } else if (votingActive) {
    statusNode = <span>{participant.hasVoted ? '✅' : '⏳'}</span>;
  }

  return (
    <li className={`${styles.participantRow} ${isSpectator ? styles.spectator : ''}`}>
      <Avatar name={participant.name} avatarUrl={participant.avatarUrl} size={28} />
      <span className={styles.participantName}>
        {participant.name}
        {isMe && <span className={styles.youBadge}> (вы)</span>}
      </span>
      {participant.isOwner && <span className={styles.ownerBadge}>владелец</span>}
      {statusNode}
    </li>
  );
}
