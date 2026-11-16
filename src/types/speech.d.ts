// Local shapes for the still non-universal recognition API. Do not redeclare DOM globals.
export interface RecognitionCallbacks {
  onListening(): void;
  onResult(text: string): void;
  onError(code: string): void;
  onEnd(): void;
}

export interface RecognitionResultEvent {
  resultIndex: number;
  results: ArrayLike<{ isFinal: boolean; 0: { transcript: string; confidence: number } }>;
}

export interface BrowserRecognition {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  onstart: (() => void) | null;
  onresult: ((event: RecognitionResultEvent) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start(): void;
  abort(): void;
}

export type RecognitionConstructor = new () => BrowserRecognition;
