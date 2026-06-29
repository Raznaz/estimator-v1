'use client';

import { useEffect, useState } from 'react';
import type { AvatarPreset, User } from '@/shared';
import { api, ApiError } from '@/lib/api';
import styles from './AvatarPicker.module.css';

interface AvatarPickerProps {
  currentUrl?: string | null;
  onChanged: (user: User) => void;
}

export function AvatarPicker({ currentUrl, onChanged }: AvatarPickerProps) {
  const [presets, setPresets] = useState<AvatarPreset[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<AvatarPreset[]>('/users/avatars/presets', false)
      .then(setPresets)
      .catch(() => setError('Не удалось загрузить аватары'));
  }, []);

  async function selectPreset(url: string) {
    setError(null);
    setBusy(true);
    try {
      const user = await api.patch<User>('/users/me', { avatarUrl: url });
      onChanged(user);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Не удалось обновить аватар');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={styles.picker}>
      <div className={styles.grid}>
        {presets.map((preset) => (
          <button
            key={preset.id}
            type="button"
            className={`${styles.option} ${preset.url === currentUrl ? styles.selected : ''}`}
            onClick={() => selectPreset(preset.url)}
            disabled={busy}
            title={preset.id}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className={styles.optionImg} src={preset.url} alt={preset.id} />
          </button>
        ))}
      </div>

      {error && <p className={styles.error}>{error}</p>}
    </div>
  );
}
