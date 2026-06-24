/**
 * Пресеты аватаров для Planning Poker — 20 «смешных» вариантов через DiceBear.
 * Картинки генерируются по фиксированным seed'ам, файлы хранить не нужно.
 *
 * ВНИМАНИЕ: этот файл дублируется в frontend/src/shared/avatars.ts —
 * держи обе копии синхронными.
 */

/** Стиль DiceBear, используемый для пресетов */
export const AVATAR_STYLE = 'fun-emoji';

/** Базовый URL DiceBear API */
const DICEBEAR_BASE = `https://api.dicebear.com/9.x/${AVATAR_STYLE}/svg`;

/** Построить URL аватара по seed'у */
export function buildPresetAvatarUrl(seed: string): string {
  return `${DICEBEAR_BASE}?seed=${encodeURIComponent(seed)}`;
}

/** Фиксированные seed'ы 20 пресетов */
export const AVATAR_SEEDS: readonly string[] = [
  'Salem',
  'Buddy',
  'Coco',
  'Bandit',
  'Lucky',
  'Milo',
  'Loki',
  'Simba',
  'Oscar',
  'Pepper',
  'Cleo',
  'Ziggy',
  'Nova',
  'Tigger',
  'Mochi',
  'Pumpkin',
  'Biscuit',
  'Waffle',
  'Pickles',
  'Noodle',
];

export interface AvatarPreset {
  id: string;
  url: string;
}

/** Список из 20 готовых аватаров { id, url } */
export const AVATAR_PRESETS: readonly AvatarPreset[] = AVATAR_SEEDS.map((seed) => ({
  id: seed,
  url: buildPresetAvatarUrl(seed),
}));

/** Является ли URL одним из пресетов DiceBear (для валидации на бэке) */
export function isPresetAvatar(url: string): boolean {
  return AVATAR_PRESETS.some((preset) => preset.url === url);
}
