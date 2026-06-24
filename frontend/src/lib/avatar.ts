const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

/**
 * Привести URL аватара к абсолютному.
 * Пресеты DiceBear уже абсолютны; загруженные файлы приходят как /static/... —
 * для них подставляем базовый URL API.
 */
export function resolveAvatarUrl(url?: string | null): string | null {
  if (!url) return null;
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  return `${API_URL}${url}`;
}
