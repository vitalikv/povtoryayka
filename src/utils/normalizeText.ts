export function normalizeText(text: string): string {
  return text.normalize('NFC').toLocaleLowerCase('ru-RU')
    .replace(/ё/g, 'е').replace(/\p{P}/gu, ' ').replace(/\s+/gu, ' ').trim();
}

export function matchesWord(text: string, word: string): boolean {
  const normalized = normalizeText(text);
  return normalized.length > 0 && normalized === normalizeText(word);
}
