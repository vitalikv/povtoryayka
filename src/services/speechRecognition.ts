import type { BrowserRecognition, RecognitionCallbacks, RecognitionConstructor } from '../types/speech';

export function getRecognitionConstructor(host: object = globalThis): RecognitionConstructor | undefined {
  const browser = host as { SpeechRecognition?: RecognitionConstructor; webkitSpeechRecognition?: RecognitionConstructor };
  return browser.SpeechRecognition ?? browser.webkitSpeechRecognition;
}

export class SpeechRecognitionService {
  private generation = 0;
  private active?: { recognition: BrowserRecognition; timer: ReturnType<typeof setTimeout> };
  get supported(): boolean { return !!this.Constructor; }

  constructor(private readonly Constructor = getRecognitionConstructor()) {}

  start(callbacks: RecognitionCallbacks): void {
    if (this.active || !this.Constructor) return;
    const id = ++this.generation;
    let recognition: BrowserRecognition;
    let received = false;
    const current = () => id === this.generation && !!this.active;
    const finish = (abort: boolean) => {
      if (!current()) return;
      const active = this.active!;
      ++this.generation;
      this.active = undefined;
      clearTimeout(active.timer);
      this.detach(active.recognition);
      if (abort) { try { active.recognition.abort(); } catch { /* Already stopped. */ } }
      callbacks.onEnd();
    };
    try {
      recognition = new this.Constructor();
      recognition.lang = 'ru-RU';
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;
      recognition.onstart = () => { if (current() && !received) callbacks.onListening(); };
      recognition.onresult = event => {
        if (!current() || received) return;
        const result = event.results[event.resultIndex];
        if (!result?.isFinal) return;
        received = true;
        callbacks.onResult(result[0]?.transcript ?? '');
        finish(true);
      };
      recognition.onerror = event => {
        if (!current() || received) return;
        received = true;
        callbacks.onError(event.error);
        finish(true);
      };
      recognition.onend = () => finish(false);
      this.active = { recognition, timer: setTimeout(() => {
        if (!current()) return;
        received = true;
        callbacks.onError('no-speech');
        finish(true);
      }, 12000) };
      recognition.start();
    } catch {
      callbacks.onError('start-failed');
      if (this.active) finish(true); else callbacks.onEnd();
    }
  }

  stop(): void {
    ++this.generation;
    const active = this.active;
    this.active = undefined;
    if (!active) return;
    clearTimeout(active.timer);
    this.detach(active.recognition);
    try { active.recognition.abort(); } catch { /* Already stopped. */ }
  }

  private detach(recognition: BrowserRecognition): void {
    recognition.onstart = null;
    recognition.onresult = null;
    recognition.onerror = null;
    recognition.onend = null;
  }
}
