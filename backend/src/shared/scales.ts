/**
 * Шкалы оценки для Planning Poker.
 * Значения хранятся строками, чтобы поддержать спецкарты '?' и '☕'.
 */

export const SPECIAL_CARDS = {
  /** Не знаю / нужно обсудить */
  UNKNOWN: '?',
  /** Нужен перерыв */
  COFFEE: '☕',
} as const;

/** Классическая последовательность Фибоначчи */
export const FIBONACCI: readonly string[] = [
  '0',
  '1',
  '2',
  '3',
  '5',
  '8',
  '13',
  '21',
  SPECIAL_CARDS.UNKNOWN,
  SPECIAL_CARDS.COFFEE,
];

/** Модифицированная шкала Фибоначчи (часто используется в Scrum) */
export const MODIFIED_FIBONACCI: readonly string[] = [
  '0',
  '0.5',
  '1',
  '2',
  '3',
  '5',
  '8',
  '13',
  '20',
  '40',
  '100',
  SPECIAL_CARDS.UNKNOWN,
  SPECIAL_CARDS.COFFEE,
];

/** Шкала «футболок» (T-shirt sizes) */
export const T_SHIRT: readonly string[] = [
  'XS',
  'S',
  'M',
  'L',
  'XL',
  'XXL',
  SPECIAL_CARDS.UNKNOWN,
  SPECIAL_CARDS.COFFEE,
];

/** Степени двойки */
export const POWERS_OF_TWO: readonly string[] = [
  '1',
  '2',
  '4',
  '8',
  '16',
  '32',
  '64',
  SPECIAL_CARDS.UNKNOWN,
  SPECIAL_CARDS.COFFEE,
];

export type ScaleType = 'FIBONACCI' | 'MODIFIED_FIBONACCI' | 'T_SHIRT' | 'POWERS_OF_TWO';

/** Сопоставление enum шкалы со списком карт */
export const SCALES: Record<ScaleType, readonly string[]> = {
  FIBONACCI,
  MODIFIED_FIBONACCI,
  T_SHIRT,
  POWERS_OF_TWO,
};
