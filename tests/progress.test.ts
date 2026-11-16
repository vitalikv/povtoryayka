import { describe, expect, it } from 'vitest';
import { words } from '../src/data/words';
import { matchesWord, normalizeText } from '../src/utils/normalizeText';
import { freshProgress, parseProgress, ProgressStore } from '../src/utils/storage';

describe('словарь и сравнение', () => {
  it('содержит 20 уникальных слов и стул', () => {
    expect(words).toHaveLength(20);
    expect(new Set(words.map(w => w.id)).size).toBe(20);
    expect(words.find(w => w.emoji === '🪑')?.word).toBe('стул');
  });
  it.each([' КОШКА! ', '«кошка»', 'кошка...', '\nкошка\t'])('нормализует %s', text => {
    expect(matchesWord(text, 'кошка')).toBe(true);
  });
  it('нормализует ё/е и повторные пробелы', () => {
    expect(matchesWord('ЁЖ!', 'еж')).toBe(true);
    expect(normalizeText('  два\n  слова ')).toBe('два слова');
  });
  it.each(['кошечка', 'это кошка', 'кошка собака', 'кошкакошка', 'к-о-ш-к-а', '', '!!!'])('не засчитывает %s', text => {
    expect(matchesWord(text, 'кошка')).toBe(false);
  });
});

describe('проверка сохранённых данных', () => {
  const valid = { ...freshProgress(), currentWordId: words[3].id, awardedWordIds: [words[0].id], totalStars: 6, congratulationsShown: 1 };
  it('восстанавливает корректные данные', () => expect(parseProgress(JSON.stringify(valid))).toEqual(valid));
  it.each([
    null, '{bad', 'null', '[]', '{}', '42',
    JSON.stringify({ ...valid, version: 2 }),
    JSON.stringify({ ...valid, currentWordId: 'unknown' }),
    JSON.stringify({ ...valid, awardedWordIds: ['unknown'] }),
    JSON.stringify({ ...valid, awardedWordIds: [words[0].id, words[0].id] }),
    JSON.stringify({ ...valid, totalStars: '6' }),
    JSON.stringify({ ...valid, totalStars: -1 }),
    JSON.stringify({ ...valid, totalStars: 6.5 }),
    JSON.stringify({ ...valid, totalStars: 0 }),
    JSON.stringify({ ...valid, totalStars: Number.MAX_SAFE_INTEGER + 1 }),
    JSON.stringify({ ...valid, congratulationsShown: 0 }),
    JSON.stringify({ ...valid, congratulationsShown: -1 }),
    JSON.stringify({ ...valid, awardedWordIds: null }),
    JSON.stringify({ version: 1, currentWordId: words[0].id }),
  ])('безопасно сбрасывает повреждённые данные: %s', raw => {
    expect(parseProgress(raw)).toEqual(freshProgress());
  });
  it('переживает запрет чтения хранилища и доступа к самому свойству', () => {
    const store = new ProgressStore(() => { throw new Error('SecurityError'); });
    expect(store.load()).toEqual(freshProgress());
    expect(store.available).toBe(false);
    expect(() => store.save(freshProgress())).not.toThrow();
  });
  it('переживает превышение квоты записи', () => {
    const store = new ProgressStore(() => ({ getItem: () => null, setItem: () => { throw new Error('QuotaExceededError'); } }));
    expect(store.load()).toEqual(freshProgress());
    store.save(freshProgress());
    expect(store.available).toBe(false);
  });
});
