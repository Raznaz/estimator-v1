'use client';

import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { resolveAvatarUrl } from '@/lib/avatar';
import styles from './AppHeader.module.css';

export function AppHeader() {
  const { user, loading, logout } = useAuth();

  return (
    <header className={styles.header}>
      <Link href="/" className={styles.brand}>
        🃏 Estimator
      </Link>

      <nav className={styles.nav}>
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
            <Link href="/login" className={styles.link}>
              Войти
            </Link>
            <Link href="/register" className={styles.linkPrimary}>
              Регистрация
            </Link>
          </>
        )}
      </nav>
    </header>
  );
}
