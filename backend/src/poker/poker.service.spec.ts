import { averageEstimate } from './poker.service';
import { SPECIAL_CARDS } from '../shared';

/**
 * Расчёт итоговой оценки раунда. Чистая функция — БД и Nest-контекст не нужны.
 */
describe('averageEstimate', () => {
  it('считает среднее по числовым голосам с одним знаком после запятой', () => {
    expect(averageEstimate(['1', '2', '3'])).toBe('2.0');
    expect(averageEstimate(['3', '5'])).toBe('4.0');
    expect(averageEstimate(['1', '2'])).toBe('1.5');
  });

  it('игнорирует спецкарты «?» и «☕»', () => {
    expect(averageEstimate(['2', SPECIAL_CARDS.UNKNOWN, '4', SPECIAL_CARDS.COFFEE])).toBe('3.0');
  });

  it('игнорирует нечисловые карты T-shirt-шкалы', () => {
    expect(averageEstimate(['M', 'L', 'XL'])).toBeNull();
  });

  it('возвращает null, когда числовых голосов нет', () => {
    expect(averageEstimate([])).toBeNull();
    expect(averageEstimate([SPECIAL_CARDS.UNKNOWN])).toBeNull();
    expect(averageEstimate(['', '   '])).toBeNull();
  });

  it('корректно обрабатывает дробные значения модифицированной шкалы', () => {
    expect(averageEstimate(['0.5', '1.5'])).toBe('1.0');
  });

  it('учитывает голос «0» как число, а не как пустое значение', () => {
    expect(averageEstimate(['0', '2'])).toBe('1.0');
  });
});
