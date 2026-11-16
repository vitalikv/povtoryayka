import { words } from './data/words';
import { matchesWord } from './utils/normalizeText';
import { ProgressStore, type Progress } from './utils/storage';
import type { RecognitionCallbacks } from './types/speech';
import type { SynthesisPort } from './services/speechSynthesis';

export interface RecognitionPort {
  readonly supported: boolean;
  start(callbacks: RecognitionCallbacks): void;
  stop(): void;
}

export type Phase = 'ready' | 'speaking' | 'starting' | 'listening' | 'success' | 'retry' | 'error';
export interface AppState {
  progress: Progress;
  phase: Phase;
  message: string;
  celebration: boolean;
  storageAvailable: boolean;
}

const errorMessages: Record<string, string> = {
  'not-allowed': 'Микрофон выключен. Взрослый может разрешить доступ в настройках сайта. А пока послушаем слово!',
  'service-not-allowed': 'Браузер не разрешил распознавание. Можно слушать и повторять вместе со взрослым.',
  'audio-capture': 'Микрофон не найден или занят. Попроси взрослого проверить подключение.',
  network: 'Не получилось подключиться к распознаванию. Взрослый может проверить интернет. А пока повторим сами!',
  'language-not-supported': 'Русское распознавание недоступно. Можно слушать и повторять вместе со взрослым.',
  'start-failed': 'Не получилось включить микрофон. Попробуй ещё раз вместе со взрослым.',
};

export class AppController {
  private state: AppState;
  private generation = 0;
  private listeners = new Set<(state: AppState) => void>();
  private disposed = false;

  constructor(
    private readonly recognition: RecognitionPort,
    private readonly synthesis: SynthesisPort,
    private readonly store = new ProgressStore(),
  ) {
    this.state = {
      progress: store.load(), phase: 'ready', message: 'Послушай слово, а потом повтори!',
      celebration: false, storageAvailable: store.available,
    };
  }

  get snapshot(): AppState {
    return { ...this.state, progress: { ...this.state.progress, awardedWordIds: [...this.state.progress.awardedWordIds] } };
  }
  get word() { return words.find(word => word.id === this.state.progress.currentWordId)!; }
  get index() { return words.findIndex(word => word.id === this.word.id); }
  get busy() { return this.state.phase === 'starting' || this.state.phase === 'listening'; }
  get recognitionSupported() { return this.recognition.supported; }
  get synthesisSupported() { return this.synthesis.supported; }

  subscribe(listener: (state: AppState) => void): () => void {
    this.listeners.add(listener);
    listener(this.snapshot);
    return () => this.listeners.delete(listener);
  }

  listen(): void {
    if (this.disposed || this.busy) return;
    this.cancel();
    const id = this.generation;
    this.update('speaking', 'Слушаем слово…');
    this.synthesis.speak(this.word.word,
      () => { if (id === this.generation) this.update('ready', 'Теперь твоя очередь!'); },
      message => { if (id === this.generation) this.update('error', message); });
  }

  repeat(): void {
    if (this.disposed || this.busy || !this.recognition.supported) return;
    this.cancel();
    const id = this.generation;
    const word = this.word;
    let received = false;
    const current = () => !this.disposed && id === this.generation && word.id === this.word.id;
    this.update('starting', 'Включаем микрофон…');
    this.recognition.start({
      onListening: () => { if (current() && !received) this.update('listening', 'Слушаю…'); },
      onResult: text => {
        if (!current() || received) return;
        received = true;
        if (matchesWord(text, word.word)) {
          const p = this.state.progress;
          const newAward = !p.awardedWordIds.includes(word.id) && p.totalStars < Number.MAX_SAFE_INTEGER;
          if (newAward) {
            p.awardedWordIds.push(word.id);
            p.totalStars += 1;
            const shown = Math.floor(p.totalStars / 5);
            this.state.celebration = shown > p.congratulationsShown;
            p.congratulationsShown = shown;
            this.persist();
          }
          this.update('success', this.state.celebration
            ? 'Ура! Ещё пять звёзд! Молодец!'
            : 'Молодец! Отлично получилось!', false);
        } else this.update('retry', 'Давай послушаем ещё раз!');
      },
      onError: code => {
        if (!current() || received) return;
        received = true;
        this.update(code === 'no-speech' || code === 'aborted' ? 'retry' : 'error',
          errorMessages[code] ?? (code === 'no-speech' || code === 'aborted'
            ? 'Давай послушаем ещё раз!' : 'Не получилось услышать слово. Попробуем ещё раз вместе со взрослым.'));
      },
      onEnd: () => {
        if (!current()) return;
        if (!received) this.update('retry', 'Давай послушаем ещё раз!');
        // Invalidate this completed attempt, including any duplicated late results.
        this.generation += 1;
      },
    });
  }

  next(): void {
    if (this.disposed || this.index === words.length - 1) return;
    const next = words[this.index + 1];
    this.cancel();
    this.state.progress.currentWordId = next.id;
    this.persist();
    this.update('ready', 'Послушай слово, а потом повтори!');
  }

  newRound(): void {
    if (this.disposed) return;
    this.cancel();
    this.state.progress.currentWordId = words[0].id;
    this.state.progress.awardedWordIds = [];
    this.persist();
    this.update('ready', 'Новый круг! Давай соберём ещё звёзды!');
  }

  pause(): void {
    if (this.disposed) return;
    this.cancel();
    this.update('ready', 'Продолжим, когда будешь готов!');
  }

  dispose(): void {
    this.cancel();
    this.disposed = true;
    this.listeners.clear();
  }

  private cancel(): void {
    this.generation += 1;
    this.recognition.stop();
    this.synthesis.stop();
  }
  private persist(): void {
    this.store.save(this.state.progress);
    this.state.storageAvailable = this.store.available;
  }
  private update(phase: Phase, message: string, clearCelebration = true): void {
    this.state.phase = phase;
    this.state.message = message;
    if (clearCelebration) this.state.celebration = false;
    for (const listener of this.listeners) listener(this.snapshot);
  }
}
