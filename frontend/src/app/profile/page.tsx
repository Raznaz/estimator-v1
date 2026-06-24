'use client';

import Link from 'next/link';
import { useEffect, useState, type FormEvent } from 'react';
import type { User } from '@/shared';
import { AvatarPicker } from '@/components/AvatarPicker';
import { api, ApiError } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { resolveAvatarUrl } from '@/lib/avatar';
import formStyles from '@/components/forms.module.css';
import styles from './page.module.css';

export default function ProfilePage() {
  const { user, loading, updateUser } = useAuth();

  if (loading) {
    return <p className={styles.placeholder}>Загрузка…</p>;
  }

  if (!user) {
    return (
      <div className={formStyles.card}>
        <h1 className={formStyles.title}>Профиль</h1>
        <p className={formStyles.hint}>
          Чтобы редактировать профиль, <Link href="/login">войдите</Link> или{' '}
          <Link href="/register">зарегистрируйтесь</Link>.
        </p>
      </div>
    );
  }

  return <ProfileContent user={user} onUpdated={updateUser} />;
}

function ProfileContent({
  user,
  onUpdated,
}: {
  user: User;
  onUpdated: (user: User) => void;
}) {
  return (
    <div className={styles.layout}>
      <h1 className={styles.heading}>Профиль</h1>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Аватар</h2>
        <div className={styles.avatarRow}>
          {user.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              className={styles.currentAvatar}
              src={resolveAvatarUrl(user.avatarUrl) ?? undefined}
              alt={user.name}
            />
          ) : (
            <span className={styles.currentAvatarFallback}>
              {user.name.charAt(0).toUpperCase()}
            </span>
          )}
        </div>
        <AvatarPicker currentUrl={user.avatarUrl} onChanged={onUpdated} />
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Данные</h2>
        <ProfileForm user={user} onUpdated={onUpdated} />
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Смена пароля</h2>
        <PasswordForm />
      </section>
    </div>
  );
}

function ProfileForm({ user, onUpdated }: { user: User; onUpdated: (user: User) => void }) {
  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email ?? '');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    setSubmitting(true);
    try {
      const updated = await api.patch<User>('/users/me', {
        name,
        email: email || undefined,
      });
      onUpdated(updated);
      setSuccess(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Не удалось сохранить');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className={formStyles.form} onSubmit={handleSubmit}>
      <div className={formStyles.field}>
        <label className={formStyles.label} htmlFor="name">
          Имя
        </label>
        <input
          id="name"
          className={formStyles.input}
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
      </div>
      <div className={formStyles.field}>
        <label className={formStyles.label} htmlFor="email">
          Email
        </label>
        <input
          id="email"
          className={formStyles.input}
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>
      {error && <p className={formStyles.error}>{error}</p>}
      {success && <p className={formStyles.success}>Сохранено</p>}
      <button className={formStyles.button} type="submit" disabled={submitting}>
        {submitting ? 'Сохранение…' : 'Сохранить'}
      </button>
    </form>
  );
}

function PasswordForm() {
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    setSubmitting(true);
    try {
      await api.post('/users/me/password', { oldPassword, newPassword });
      setSuccess(true);
      setOldPassword('');
      setNewPassword('');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Не удалось сменить пароль');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className={formStyles.form} onSubmit={handleSubmit}>
      <div className={formStyles.field}>
        <label className={formStyles.label} htmlFor="oldPassword">
          Текущий пароль
        </label>
        <input
          id="oldPassword"
          className={formStyles.input}
          type="password"
          value={oldPassword}
          onChange={(e) => setOldPassword(e.target.value)}
          required
        />
      </div>
      <div className={formStyles.field}>
        <label className={formStyles.label} htmlFor="newPassword">
          Новый пароль (минимум 8 символов)
        </label>
        <input
          id="newPassword"
          className={formStyles.input}
          type="password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          minLength={8}
          required
        />
      </div>
      {error && <p className={formStyles.error}>{error}</p>}
      {success && <p className={formStyles.success}>Пароль изменён</p>}
      <button className={formStyles.button} type="submit" disabled={submitting}>
        {submitting ? 'Сохранение…' : 'Сменить пароль'}
      </button>
    </form>
  );
}
