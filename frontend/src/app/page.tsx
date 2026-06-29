'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { api, ApiError } from '@/lib/api';
import { setDisplayName } from '@/lib/room-session';
import { setStoredUser, setTokens } from '@/lib/auth-storage';
import type { Room, User } from '@/shared';
import styles from './page.module.css';

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

  function closeModal() {
    if (creating) return;
    setMode(null);
    setError(null);
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
        <button className={styles.primaryButton} type="button" onClick={() => setMode('create')}>
          Создать комнату
        </button>
        <button className={styles.secondaryButton} type="button" onClick={() => setMode('join')}>
          Присоединиться
        </button>
      </div>

      {mode === 'create' && (
        <div className={styles.overlay} onClick={closeModal}>
          <form className={styles.modal} onClick={(e) => e.stopPropagation()} onSubmit={handleCreate}>
            <h2 className={styles.modalTitle}>Новая комната</h2>

            {error && <p className={styles.error}>{error}</p>}

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
          </form>
        </div>
      )}

      {mode === 'join' && (
        <div className={styles.overlay} onClick={closeModal}>
          <form className={styles.modal} onClick={(e) => e.stopPropagation()} onSubmit={handleJoin}>
            <h2 className={styles.modalTitle}>Присоединиться к комнате</h2>

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
          </form>
        </div>
      )}
    </section>
  );
}
