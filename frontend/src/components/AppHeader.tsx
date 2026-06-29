'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useRoomHeader } from '@/lib/room-header-context';
import { resolveAvatarUrl } from '@/lib/avatar';
import { ThemeToggle } from './ThemeToggle';
import styles from './AppHeader.module.css';

export function AppHeader() {
  const { user, loading, logout } = useAuth();
  const { info } = useRoomHeader();
  const pathname = usePathname();
  const [copied, setCopied] = useState(false);

  // Сохраняем текущую страницу, чтобы вернуться сюда после входа/регистрации.
  const returnTo = pathname && pathname !== '/' ? `?returnTo=${encodeURIComponent(pathname)}` : '';

  async function copyInvite() {
    if (!info) return;
    const url = `${window.location.origin}/room/${info.code}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard может быть недоступен — молча игнорируем */
    }
  }

  return (
    <header className={styles.header}>
      <Link href="/" className={styles.brand}>
        <span className={styles.mark} aria-hidden>
          <svg viewBox="0 0 28 28" width="28" height="28">
            <rect
              x="4"
              y="7"
              width="14"
              height="18"
              rx="3"
              fill="var(--color-felt)"
              transform="rotate(-10 11 16)"
            />
            <rect
              x="10"
              y="4"
              width="14"
              height="18"
              rx="3"
              fill="var(--color-accent)"
              transform="rotate(8 17 13)"
            />
            <text
              x="17"
              y="16"
              transform="rotate(8 17 13)"
              textAnchor="middle"
              fontFamily="var(--font-display)"
              fontSize="9"
              fontWeight="700"
              fill="var(--color-on-accent)"
            >
              8
            </text>
          </svg>
        </span>
        Estimator
      </Link>

      {info && (
        <div className={styles.room}>
          <span className={styles.roomMeta}>
            Комната <strong className={styles.roomCode}>{info.code}</strong>
            {info.name && info.name !== `Комната ${info.code}` ? ` · ${info.name}` : ''}
          </span>
          <button className={styles.inviteButton} onClick={copyInvite} type="button">
            🔗 {copied ? 'Скопировано!' : 'Пригласить'}
          </button>
        </div>
      )}

      <nav className={styles.nav}>
        <ThemeToggle />
        {loading ? null : user ? (
          <>
            <Link href="/profile" className={styles.user}>
              {user.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  className={styles.avatar}
                  src={resolveAvatarUrl(user.avatarUrl) ?? undefined}
                  alt={user.name}
                />
              ) : (
                <span className={styles.avatarFallback}>{user.name.charAt(0).toUpperCase()}</span>
              )}
              <span className={styles.userName}>{user.name}</span>
            </Link>
            <button type="button" className={styles.linkButton} onClick={() => logout()}>
              Выйти
            </button>
          </>
        ) : (
          <>
            <Link href={`/login${returnTo}`} className={styles.link}>
              Войти
            </Link>
            <Link href={`/register${returnTo}`} className={styles.linkPrimary}>
              Регистрация
            </Link>
          </>
        )}
      </nav>
    </header>
  );
}
