import { afterEach, describe, expect, it, vi } from 'vitest';
import { AppController } from '../src/app';
import { ProgressStore, STORAGE_KEY } from '../src/utils/storage';
import { words } from '../src/data/words';
import { getRecognitionConstructor, SpeechRecognitionService } from '../src/services/speechRecognition';
import { FakeRecognition, harness } from './helpers';

afterEach(() => vi.useRealTimers());

describe('награды, сохранение и круги с подменой браузерного API', () => {
  it('выдаёт одну звезду при повторных попытках и дублированных событиях', () => {
    const { app, latest } = harness();
    app.repeat();
    const lateResult = latest().onresult!;
    latest().result(app.word.word);
    lateResult({ resultIndex: 0, results: [{ isFinal: true, 0: { transcript: app.word.word, confidence: 1 } }] });
    app.repeat();
    latest().result(app.word.word);
    expect(app.snapshot.progress.totalStars).toBe(1);
    expect(app.snapshot.progress.awardedWordIds).toEqual([words[0].id]);
    app.dispose();
  });

  it('восстанавливает прогресс и не повторяет поздравления на границах 5/10/15/20', () => {
    const h = harness();
    for (let i = 0; i < 20; i++) {
      h.app.repeat();
      h.latest().result(h.app.word.word);
      expect(h.app.snapshot.celebration).toBe((i + 1) % 5 === 0);
      if ((i + 1) % 5 === 0) {
        const restored = new AppController(h.recognition, h.synthesis, new ProgressStore(() => h.storage));
        expect(restored.snapshot.progress).toEqual(h.app.snapshot.progress);
        expect(restored.snapshot.celebration).toBe(false);
        restored.repeat();
        h.latest().result(restored.word.word);
        expect(restored.snapshot.progress.totalStars).toBe(i + 1);
        expect(restored.snapshot.celebration).toBe(false);
        restored.dispose();
      }
      h.app.next();
    }
    expect(h.app.snapshot.progress.congratulationsShown).toBe(4);
    h.app.newRound();
    expect(h.app.index).toBe(0);
    expect(h.app.snapshot.progress.awardedWordIds).toEqual([]);
    expect(h.app.snapshot.progress.totalStars).toBe(20);
    expect(h.app.snapshot.progress.congratulationsShown).toBe(4);
    for (let i = 0; i < 5; i++) {
      h.app.repeat(); h.latest().result(h.app.word.word);
      expect(h.app.snapshot.celebration).toBe(i === 4);
      h.app.next();
    }
    expect(h.app.snapshot.progress.totalStars).toBe(25);
    expect(h.app.snapshot.progress.congratulationsShown).toBe(5);
    expect(JSON.parse(h.storage.getItem(STORAGE_KEY)!)).toEqual(h.app.snapshot.progress);
    h.app.dispose();
  });

  it('сохраняет поздравление до уведомления интерфейса', () => {
    const h = harness();
    h.app.subscribe(state => {
      if (state.celebration) expect(JSON.parse(h.storage.getItem(STORAGE_KEY)!).congratulationsShown).toBe(1);
    });
    for (let i = 0; i < 5; i++) { h.app.repeat(); h.latest().result(h.app.word.word); h.app.next(); }
    h.app.dispose();
  });

  it.each([0, 0.01, 1])('confidence=%s не влияет на совпадение', confidence => {
    const h = harness();
    h.app.repeat(); h.latest().result('кошка', confidence);
    expect(h.app.snapshot.progress.totalStars).toBe(1);
    h.app.next(); h.app.repeat(); h.latest().result('это собака', confidence);
    expect(h.app.snapshot.progress.totalStars).toBe(1);
    expect(h.app.snapshot.phase).toBe('retry');
    h.app.dispose();
  });

  it('продолжает награждать в памяти при запрете хранилища', () => {
    const h = harness({ values: new Map(), getItem: () => { throw new Error(); }, setItem: () => { throw new Error(); } });
    h.app.repeat(); h.latest().result(h.app.word.word);
    expect(h.app.snapshot.progress.totalStars).toBe(1);
    expect(h.app.snapshot.storageAvailable).toBe(false);
    h.app.dispose();
  });
});

describe('жизненный цикл микрофона', () => {
  it('блокирует озвучку и параллельную попытку до разрешения и во время слушания', () => {
    const h = harness();
    h.app.listen();
    expect(h.synthesis.speak).toHaveBeenCalledTimes(1);
    h.app.repeat();
    const instance = h.latest();
    expect(h.synthesis.stop).toHaveBeenCalled();
    expect(h.app.snapshot.phase).toBe('starting');
    h.app.repeat(); h.app.listen();
    expect(FakeRecognition.instances).toHaveLength(1);
    expect(h.synthesis.speak).toHaveBeenCalledTimes(1);
    instance.onstart?.();
    h.app.repeat(); h.app.listen();
    expect(h.app.snapshot.phase).toBe('listening');
    expect(FakeRecognition.instances).toHaveLength(1);
    expect(instance.lang).toBe('ru-RU');
    expect(instance.continuous).toBe(false);
    expect(instance.interimResults).toBe(false);
    instance.result('кошка');
    expect(h.app.busy).toBe(false);
    h.app.dispose();
  });

  it('при смене карточки игнорирует все запоздалые события старой попытки', () => {
    const h = harness();
    h.app.repeat();
    const old = h.latest();
    const events = { result: old.onresult!, error: old.onerror!, end: old.onend!, start: old.onstart! };
    h.app.next();
    expect(old.abort).toHaveBeenCalledTimes(1);
    h.app.repeat(); h.latest().onstart?.();
    events.result({ resultIndex: 0, results: [{ isFinal: true, 0: { transcript: 'кошка', confidence: 1 } }] });
    events.error({ error: 'not-allowed' }); events.end(); events.start();
    expect(h.app.index).toBe(1);
    expect(h.app.snapshot.progress.totalStars).toBe(0);
    expect(h.app.snapshot.phase).toBe('listening');
    h.latest().result('собака');
    expect(h.app.snapshot.progress.awardedWordIds).toEqual([words[1].id]);
    h.app.dispose();
  });

  it.each(['no-speech', 'not-allowed', 'audio-capture', 'network', 'service-not-allowed', 'aborted', 'unknown'])('обрабатывает %s без награды', error => {
    const h = harness();
    h.app.repeat(); h.latest().onerror?.({ error });
    expect(h.app.busy).toBe(false);
    expect(h.app.snapshot.progress.totalStars).toBe(0);
    expect(h.app.snapshot.message).not.toMatch(/неправильно/i);
    h.app.dispose();
  });

  it('завершает попытку при тишине и при тайм-ауте', () => {
    vi.useFakeTimers();
    const h = harness();
    h.app.repeat(); h.latest().onend?.();
    expect(h.app.snapshot.phase).toBe('retry');
    h.app.repeat(); vi.advanceTimersByTime(12000);
    expect(h.latest().abort).toHaveBeenCalled();
    expect(h.app.snapshot.phase).toBe('retry');
    expect(h.app.busy).toBe(false);
    h.app.dispose();
  });

  it('переживает исключение при запуске', () => {
    class Throwing extends FakeRecognition { start = vi.fn(() => { throw new Error('InvalidStateError'); }); }
    const h = harness(undefined, Throwing);
    h.app.repeat();
    expect(h.app.snapshot.phase).toBe('error');
    expect(h.app.busy).toBe(false);
    h.app.dispose();
  });

  it('поддерживает оба имени API и отсутствие распознавания', () => {
    expect(getRecognitionConstructor({ SpeechRecognition: FakeRecognition })).toBe(FakeRecognition);
    expect(getRecognitionConstructor({ webkitSpeechRecognition: FakeRecognition })).toBe(FakeRecognition);
    expect(getRecognitionConstructor({})).toBeUndefined();
    const service = new SpeechRecognitionService();
    expect(service.supported).toBe(false);
  });
});
