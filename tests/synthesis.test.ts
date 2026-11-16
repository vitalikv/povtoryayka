// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SpeechSynthesisService } from '../src/services/speechSynthesis';

class Utterance {
  lang = '';
  voice: SpeechSynthesisVoice | null = null;
  rate = 1;
  onend: (() => void) | null = null;
  onerror: (() => void) | null = null;
  constructor(public text: string) {}
}

function setup(voices: SpeechSynthesisVoice[] = [{ lang: 'ru-RU' } as SpeechSynthesisVoice]) {
  vi.useFakeTimers();
  vi.stubGlobal('SpeechSynthesisUtterance', Utterance);
  const engine = Object.assign(new EventTarget(), { getVoices: vi.fn(() => voices), speak: vi.fn(), cancel: vi.fn() });
  const service = new SpeechSynthesisService(engine as unknown as SpeechSynthesis);
  return { service, engine, end: vi.fn(), error: vi.fn() };
}

afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

describe('озвучка', () => {
  it('выбирает русский голос, скорость 0.85 и завершает озвучку', () => {
    const h = setup();
    h.service.speak('кошка', h.end, h.error);
    const utterance = h.engine.speak.mock.calls[0][0] as Utterance;
    expect(utterance.text).toBe('кошка');
    expect(utterance.lang).toBe('ru-RU');
    expect(utterance.rate).toBe(0.85);
    utterance.onend?.();
    expect(h.end).toHaveBeenCalledOnce();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('дожидается асинхронной загрузки голосов', () => {
    const h = setup([]);
    h.service.speak('кошка', h.end, h.error);
    expect(h.engine.speak).not.toHaveBeenCalled();
    h.engine.getVoices.mockReturnValue([{ lang: 'ru-RU' } as SpeechSynthesisVoice]);
    h.engine.dispatchEvent(new Event('voiceschanged'));
    expect(h.engine.speak).toHaveBeenCalledOnce();
    h.service.stop();
  });

  it('сообщает об отсутствии русского голоса без зависания', () => {
    const h = setup([{ lang: 'en-US' } as SpeechSynthesisVoice]);
    h.service.speak('кошка', h.end, h.error);
    vi.advanceTimersByTime(1500);
    expect(h.error).toHaveBeenCalledWith(expect.stringContaining('Не найден русский голос'));
    expect(h.engine.speak).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('перезапускает озвучку и игнорирует завершение старой', () => {
    const h = setup();
    h.service.speak('кошка', h.end, h.error);
    const staleEnd = (h.engine.speak.mock.calls[0][0] as Utterance).onend!;
    h.service.speak('собака', h.end, h.error);
    staleEnd();
    expect(h.end).not.toHaveBeenCalled();
    expect(h.engine.speak).toHaveBeenCalledTimes(2);
    h.service.stop();
    expect(vi.getTimerCount()).toBe(0);
  });
});
