'use client';

import { useEffect, useRef, useState, type ChangeEvent } from 'react';
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
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  async function uploadFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setBusy(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const user = await api.upload<User>('/users/me/avatar', formData);
      onChanged(user);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Не удалось загрузить файл');
    } finally {
      setBusy(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
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

      <div className={styles.upload}>
        <button
          type="button"
          className={styles.uploadButton}
          onClick={() => fileInputRef.current?.click()}
          disabled={busy}
        >
          Загрузить свой аватар
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif"
          className={styles.hiddenInput}
          onChange={uploadFile}
        />
      </div>

      {error && <p className={styles.error}>{error}</p>}
    </div>
  );
}
