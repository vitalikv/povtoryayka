import { vi } from 'vitest';
import { AppController } from '../src/app';
import { ProgressStore, STORAGE_KEY, type StoragePort } from '../src/utils/storage';
import { SpeechRecognitionService } from '../src/services/speechRecognition';
import type { BrowserRecognition, RecognitionResultEvent } from '../src/types/speech';
import type { SynthesisPort } from '../src/services/speechSynthesis';

export class FakeRecognition implements BrowserRecognition {
  static instances: FakeRecognition[] = [];
  lang = '';
  continuous = true;
  interimResults = true;
  maxAlternatives = 5;
  onstart: (() => void) | null = null;
  onresult: ((event: RecognitionResultEvent) => void) | null = null;
  onerror: ((event: { error: string }) => void) | null = null;
  onend: (() => void) | null = null;
  start = vi.fn();
  abort = vi.fn();
  constructor() { FakeRecognition.instances.push(this); }
  result(text: string, confidence = 1) {
    this.onresult?.({ resultIndex: 0, results: [{ isFinal: true, 0: { transcript: text, confidence } }] });
  }
}

export function memoryStorage(raw: string | null = null): StoragePort & { values: Map<string, string> } {
  const values = new Map<string, string>();
  if (raw !== null) values.set(STORAGE_KEY, raw);
  return { values, getItem: key => values.get(key) ?? null, setItem: (key, value) => { values.set(key, value); } };
}

export function harness(storage = memoryStorage(), Constructor: typeof FakeRecognition | undefined = FakeRecognition) {
  FakeRecognition.instances = [];
  const recognition = new SpeechRecognitionService(Constructor);
  const synthesis: SynthesisPort = { supported: true, speak: vi.fn(), stop: vi.fn() };
  const app = new AppController(recognition, synthesis, new ProgressStore(() => storage));
  return { app, recognition, synthesis, storage, latest: () => FakeRecognition.instances.at(-1)! };
}
