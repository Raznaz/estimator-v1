import { SCALES, SPECIAL_CARDS, type ScaleType } from './scales';

/**
 * Шкалы — часть контракта, продублированного во frontend/src/shared.
 * Тесты фиксируют инварианты, которые легко нарушить при ручной синхронизации копий.
 */
describe('SCALES', () => {
  const scaleNames = Object.keys(SCALES) as ScaleType[];

  it('содержит все четыре шкалы', () => {
    expect(scaleNames.sort()).toEqual([
      'FIBONACCI',
      'MODIFIED_FIBONACCI',
      'POWERS_OF_TWO',
      'T_SHIRT',
    ]);
  });

  it.each(scaleNames)('шкала %s заканчивается спецкартами «?» и «☕»', (name) => {
    const cards = SCALES[name];
    expect(cards.slice(-2)).toEqual([SPECIAL_CARDS.UNKNOWN, SPECIAL_CARDS.COFFEE]);
  });

  it.each(scaleNames)('шкала %s не содержит дублей', (name) => {
    const cards = SCALES[name];
    expect(new Set(cards).size).toBe(cards.length);
  });

  it.each(scaleNames)('шкала %s не содержит пустых значений', (name) => {
    expect(SCALES[name].every((card) => card.trim() !== '')).toBe(true);
  });

  it('числовые шкалы отсортированы по возрастанию', () => {
    const numericScales: ScaleType[] = ['FIBONACCI', 'MODIFIED_FIBONACCI', 'POWERS_OF_TWO'];
    for (const name of numericScales) {
      const numbers = SCALES[name].filter((card) => !Number.isNaN(Number(card))).map(Number);
      expect(numbers).toEqual([...numbers].sort((a, b) => a - b));
    }
  });
});
