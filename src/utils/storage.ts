import { words } from '../data/words';

export interface Progress {
  version: 1;
  currentWordId: string;
  awardedWordIds: string[];
  totalStars: number;
  congratulationsShown: number;
}

export interface StoragePort {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export const STORAGE_KEY = 'povtoryayka.progress';
export const freshProgress = (): Progress => ({
  version: 1, currentWordId: words[0].id, awardedWordIds: [], totalStars: 0, congratulationsShown: 0,
});

const ids = new Set(words.map(word => word.id));
const counter = (value: unknown): value is number =>
  typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;

export function parseProgress(raw: string | null): Progress {
  try {
    const data: unknown = JSON.parse(raw ?? 'null');
    if (!data || typeof data !== 'object') return freshProgress();
    const p = data as Record<string, unknown>;
    if (p.version !== 1 || typeof p.currentWordId !== 'string' || !ids.has(p.currentWordId)
      || !Array.isArray(p.awardedWordIds)
      || !p.awardedWordIds.every(id => typeof id === 'string' && ids.has(id))
      || new Set(p.awardedWordIds).size !== p.awardedWordIds.length
      || !counter(p.totalStars) || p.totalStars < p.awardedWordIds.length
      || !counter(p.congratulationsShown) || p.congratulationsShown !== Math.floor(p.totalStars / 5)) {
      return freshProgress();
    }
    return {
      version: 1, currentWordId: p.currentWordId, awardedWordIds: [...p.awardedWordIds],
      totalStars: p.totalStars, congratulationsShown: p.congratulationsShown,
    };
  } catch { return freshProgress(); }
}

export class ProgressStore {
  available = true;
  constructor(private readonly getStorage: () => StoragePort = () => window.localStorage) {}

  load(): Progress {
    try { return parseProgress(this.getStorage().getItem(STORAGE_KEY)); }
    catch { this.available = false; return freshProgress(); }
  }

  save(progress: Progress): void {
    try { this.getStorage().setItem(STORAGE_KEY, JSON.stringify(progress)); }
    catch { this.available = false; }
  }
}
