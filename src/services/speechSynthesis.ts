export interface SynthesisPort {
  readonly supported: boolean;
  speak(text: string, onEnd: () => void, onError: (message: string) => void): void;
  stop(): void;
}

export class SpeechSynthesisService implements SynthesisPort {
  private generation = 0;
  private cleanup = () => {};
  private utterance?: SpeechSynthesisUtterance;
  get supported(): boolean { return !!this.synthesis; }

  constructor(private readonly synthesis: SpeechSynthesis | undefined = window.speechSynthesis) {}

  speak(text: string, onEnd: () => void, onError: (message: string) => void): void {
    this.stop();
    const synthesis = this.synthesis;
    if (!synthesis) { onError('В этом браузере нет озвучки. Взрослый может прочитать слово вслух.'); return; }
    const id = this.generation;
    let started = false;
    const finish = (message?: string) => {
      if (id !== this.generation) return;
      this.stop();
      if (message) onError(message); else onEnd();
    };
    const speakWithVoice = () => {
      if (id !== this.generation || started) return;
      const voice = synthesis.getVoices().find(v => /^ru(?:-|_)/i.test(v.lang) || v.lang === 'ru');
      if (!voice) return;
      started = true;
      const utterance = new SpeechSynthesisUtterance(text);
      this.utterance = utterance;
      utterance.lang = 'ru-RU';
      utterance.voice = voice;
      utterance.rate = 0.85;
      utterance.onend = () => finish();
      utterance.onerror = () => finish('Не получилось озвучить слово. Попробуйте ещё раз или прочитайте его вслух.');
      try { synthesis.speak(utterance); }
      catch { finish('Озвучка недоступна. Взрослый может прочитать слово вслух.'); }
    };
    const voiceTimer = setTimeout(() => {
      if (!started) finish('Не найден русский голос. Взрослый может добавить русский голос в настройках устройства или прочитать слово вслух.');
    }, 1500);
    const endTimer = setTimeout(() => finish('Озвучка не завершилась. Попробуйте ещё раз.'), 12000);
    synthesis.addEventListener('voiceschanged', speakWithVoice);
    this.cleanup = () => {
      clearTimeout(voiceTimer);
      clearTimeout(endTimer);
      synthesis.removeEventListener('voiceschanged', speakWithVoice);
    };
    speakWithVoice();
  }

  stop(): void {
    ++this.generation;
    this.cleanup();
    this.cleanup = () => {};
    if (this.utterance) {
      this.utterance.onend = null;
      this.utterance.onerror = null;
      this.utterance = undefined;
    }
    this.synthesis?.cancel();
  }
}
