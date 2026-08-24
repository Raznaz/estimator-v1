'use client';

import { useRouter } from 'next/navigation';
import { useRef, useState, type ReactNode } from 'react';
import { api, ApiError } from '@/lib/api';
import { setDisplayName } from '@/lib/room-session';
import { setStoredUser, setTokens } from '@/lib/auth-storage';
import type { Room, User } from '@/shared';
import styles from './page.module.css';

const FOCUSABLE_SELECTOR =
  'button:not(:disabled), input:not(:disabled), [href], [tabindex]:not([tabindex="-1"])';

/**
 * Модальный диалог: Escape закрывает, Tab зациклен внутри окна.
 * Возврат фокуса на элемент-триггер — забота вызывающего компонента
 * (см. lastFocusedRef в HomePage), а не эффекта монтирования: под React
 * StrictMode эффект монтируется/размонтируется дважды в dev, и cleanup
 * успевал вернуть фокус на кнопку ещё до того, как пользователь
 * что-либо сделал.
 */
function Modal({
  titleId,
  onClose,
  onSubmit,
  children,
}: {
  titleId: string;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  children: ReactNode;
}) {
  const dialogRef = useRef<HTMLFormElement>(null);

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Escape') {
      e.stopPropagation();
      onClose();
      return;
    }
    if (e.key !== 'Tab' || !dialogRef.current) return;
    const focusable = Array.from(dialogRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
    if (focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }

  return (
    <div className={styles.overlay} onClick={onClose} onKeyDown={handleKeyDown}>
      <form
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={styles.modal}
        onClick={(e) => e.stopPropagation()}
        onSubmit={onSubmit}
      >
        {children}
      </form>
    </div>
  );
}

interface CreateRoomResponse {
  room: Room;
  user?: User;
  accessToken?: string;
  refreshToken?: string;
}

export default function HomePage() {
  const router = useRouter();

  const [mode, setMode] = useState<'create' | 'join' | null>(null);
  const [createName, setCreateName] = useState('');
  const [roomName, setRoomName] = useState('');
  const [creating, setCreating] = useState(false);
  const [joinName, setJoinName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const lastFocusedRef = useRef<HTMLElement | null>(null);

  function openModal(next: 'create' | 'join', e: React.MouseEvent<HTMLButtonElement>) {
    lastFocusedRef.current = e.currentTarget;
    setMode(next);
  }

  function closeModal() {
    if (creating) return;
    setMode(null);
    setError(null);
    lastFocusedRef.current?.focus();
  }

  function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    const code = joinCode.trim().toUpperCase();
    if (!code || !joinName.trim()) return;
    setDisplayName(joinName.trim());
    router.push(`/room/${code}`);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!createName.trim()) return;
    setError(null);
    setCreating(true);
    try {
      // Шкала по умолчанию — FIBONACCI (бэкенд проставляет её сам).
      const res = await api.post<CreateRoomResponse>('/rooms', {
        ownerName: createName.trim(),
        name: roomName.trim() || undefined,
      });
      // Гость-владелец получает пару токенов — сохраняем, чтобы сокет опознал владельца.
      if (res.accessToken && res.refreshToken) {
        setTokens(res.accessToken, res.refreshToken);
      }
      if (res.user) setStoredUser(res.user);
      setDisplayName(createName.trim());
      router.push(`/room/${res.room.code}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Не удалось создать комнату');
      setCreating(false);
    }
  }

  return (
    <section className={styles.hero}>
      <div className={styles.cardFan} aria-hidden>
        {['1', '2', '3', '5', '8'].map((card, i) => {
          const offset = i - 2; // -2..2 относительно центра
          return (
            <span
              key={card}
              className={`${styles.fanCard} ${card === '3' ? styles.fanCardActive : ''}`}
              style={
                {
                  '--rot': `${offset * 7}deg`,
                  '--ty': `${Math.abs(offset) * 9}px`,
                } as React.CSSProperties
              }
            >
              {card}
            </span>
          );
        })}
      </div>

      <h1 className={styles.title}>Оцениваем задачи всей командой</h1>
      <p className={styles.subtitle}>
        Создайте комнату, пригласите команду и вскрывайте карты одновременно — оценка
        в реальном времени, без давления первого голоса.
      </p>

      <div className={styles.heroActions}>
        <button
          className={styles.primaryButton}
          type="button"
          onClick={(e) => openModal('create', e)}
        >
          Создать комнату
        </button>
        <button
          className={styles.secondaryButton}
          type="button"
          onClick={(e) => openModal('join', e)}
        >
          Присоединиться
        </button>
      </div>

      {mode === 'create' && (
        <Modal titleId="create-room-title" onClose={closeModal} onSubmit={handleCreate}>
          <h2 id="create-room-title" className={styles.modalTitle}>
            Новая комната
          </h2>

          {error && (
            <p className={styles.error} role="alert">
              {error}
            </p>
          )}

          <label className={styles.label}>
            Ваше имя
            <input
              className={styles.input}
              value={createName}
              onChange={(e) => setCreateName(e.target.value)}
              placeholder="Например, Анна"
              maxLength={60}
              autoFocus
              required
            />
          </label>
          <label className={styles.label}>
            Название комнаты (необязательно)
            <input
              className={styles.input}
              value={roomName}
              onChange={(e) => setRoomName(e.target.value)}
              placeholder="Рефайнмент команды"
              maxLength={120}
            />
          </label>

          <div className={styles.modalActions}>
            <button
              className={styles.secondaryButton}
              type="button"
              onClick={closeModal}
              disabled={creating}
            >
              Отмена
            </button>
            <button className={styles.button} type="submit" disabled={creating}>
              {creating ? 'Создаём…' : 'Создать'}
            </button>
          </div>
        </Modal>
      )}

      {mode === 'join' && (
        <Modal titleId="join-room-title" onClose={closeModal} onSubmit={handleJoin}>
          <h2 id="join-room-title" className={styles.modalTitle}>
            Присоединиться к комнате
          </h2>

          <label className={styles.label}>
            Ваше имя
            <input
              className={styles.input}
              value={joinName}
              onChange={(e) => setJoinName(e.target.value)}
              placeholder="Например, Борис"
              maxLength={60}
              autoFocus
              required
            />
          </label>
          <label className={styles.label}>
            Код комнаты
            <input
              className={styles.input}
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value)}
              placeholder="Например, ABC123"
              maxLength={12}
              required
            />
          </label>

          <div className={styles.modalActions}>
            <button className={styles.secondaryButton} type="button" onClick={closeModal}>
              Отмена
            </button>
            <button className={styles.button} type="submit">
              Войти
            </button>
          </div>
        </Modal>
      )}
    </section>
  );
}
