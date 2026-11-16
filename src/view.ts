import { AppController } from './app';
import { words } from './data/words';
import { WordCard } from './components/WordCard';
import { SpeechButton, icon } from './components/SpeechButton';
import { Feedback } from './components/Feedback';
import { ProgressBar } from './components/ProgressBar';

export function mountApp(root: HTMLElement, app: AppController): () => void {
  root.innerHTML = `
    <div class="shell">
      <header class="topbar">
        <a class="brand" href="./" aria-label="Повторяйка — главная"><span class="brand-mark">${icon('leaf')}</span>повторяйка<span class="brand-dot">.</span></a>
        <div class="total-stars" aria-label="Всего звёзд">${icon('star')}<span id="total-stars">0</span><span class="stars-label">звёзд в копилке</span></div>
      </header>
      <main>
        <section class="intro" aria-labelledby="page-title"><p class="eyebrow">СЛУШАЕМ. ПОВТОРЯЕМ. РАСТЁМ.</p><h1 id="page-title">Маленькие слова.<br><span>Большие открытия.</span></h1><p>Давай узнавать слова и собирать звёздочки!</p></section>
        <section class="game-card" aria-labelledby="word">
          <div class="card-top"><span class="category"></span><span class="card-number"></span></div>
          <div class="word-slot"></div>
          <div class="speech-actions"></div>
          <div class="feedback-slot"></div>
          <div class="card-bottom"><span class="gentle-note">В своём темпе. Всё получится.</span></div>
        </section>
        <div class="progress-slot"></div>
        <p class="capability-note" role="status"></p>
      </main>
      <footer><p class="footer-note">Немного игры, немного практики — и ещё один шаг вперёд.</p>
        <details><summary>Взрослым об игре и микрофоне</summary><div class="adult-info"><p>Играйте вместе с ребёнком. Это игровой тренажёр, а не медицинская или логопедическая диагностика. Распознанное слово не подтверждает правильное произношение отдельных звуков.</p><p>Микрофон включается только по нажатию. Браузер может отправлять аудио внешнему сервису распознавания; могут потребоваться интернет и разрешение на микрофон. Приложение не записывает и не сохраняет аудио. Точность на детском голосе и работа без интернета не гарантируются.</p><p>Основной браузер — Google Chrome на компьютере. Без распознавания можно слушать слова и повторять их со взрослым. Прогресс хранится только в этом браузере; при очистке данных сайта он удалится.</p><p class="storage-note"></p></div></details>
        <span class="footer-sign">С заботой о маленьких открытиях ${icon('leaf')}</span>
      </footer>
    </div>
    <dialog aria-labelledby="dialog-title"><form method="dialog"><span class="dialog-symbol" aria-hidden="true">✦</span><h2 id="dialog-title"></h2><p class="dialog-copy"></p><div class="dialog-actions"><button class="button button-secondary" value="cancel">Пока нет</button><button class="button button-primary" value="confirm">Продолжить</button></div></form></dialog>`;

  const card = WordCard();
  const feedback = Feedback();
  const progress = ProgressBar();
  root.querySelector('.word-slot')!.append(card.element);
  root.querySelector('.feedback-slot')!.append(feedback.element);
  root.querySelector('.progress-slot')!.append(progress.element);
  const listen = SpeechButton('Послушать', 'sound', 'button button-secondary');
  const repeat = SpeechButton('Повторить', 'mic', 'button button-primary');
  const next = SpeechButton('Следующее слово', 'arrow', 'button button-next');
  root.querySelector('.speech-actions')!.append(listen, repeat);
  root.querySelector('.card-bottom')!.append(next);

  const dialog = root.querySelector('dialog')!;
  const confirm = dialog.querySelector<HTMLButtonElement>('[value="confirm"]')!;
  let consentGiven = false;
  let pending: (() => void) | undefined;
  function ask(title: string, copy: string, label: string, action: () => void) {
    app.pause();
    root.querySelector('#dialog-title')!.textContent = title;
    root.querySelector('.dialog-copy')!.textContent = copy;
    confirm.textContent = label;
    dialog.returnValue = '';
    pending = action;
    dialog.showModal();
  }
  const onClose = () => {
    // A queued close from a previous opening can arrive after a quick reopen.
    if (dialog.open) return;
    const action = pending;
    pending = undefined;
    if (dialog.returnValue === 'confirm') action?.();
  };
  const onListen = () => app.listen();
  const onRepeat = () => {
    if (consentGiven) app.repeat();
    else ask('Взрослым: перед началом', 'Браузер может отправлять голос ребёнка внешнему сервису распознавания. Для работы могут понадобиться интернет и разрешение на микрофон. Приложение не сохраняет аудио. Распознавание не оценивает произношение звуков. Продолжайте вместе со взрослым.', 'Понятно, включить микрофон', () => {
      consentGiven = true;
      app.repeat();
    });
  };
  const onNext = () => {
    if (app.index < words.length - 1) app.next();
    else ask('Ещё один круг?', 'Мы посмотрели все 20 слов! В новом круге можно снова собирать звёздочки. Все звёзды в копилке останутся с тобой.', 'Начать новый круг', () => app.newRound());
  };
  listen.addEventListener('click', onListen);
  repeat.addEventListener('click', onRepeat);
  next.addEventListener('click', onNext);
  dialog.addEventListener('close', onClose);

  const unsubscribe = app.subscribe(state => {
    card.update(app.word, state.progress.awardedWordIds.includes(app.word.id));
    feedback.update(state);
    progress.update(state.progress.awardedWordIds.length);
    root.querySelector('.category')!.textContent = app.word.category;
    root.querySelector('.card-number')!.textContent = `Слово ${app.index + 1} из ${words.length}`;
    root.querySelector('#total-stars')!.textContent = String(state.progress.totalStars);
    listen.disabled = app.busy || !app.synthesisSupported;
    repeat.disabled = app.busy || !app.recognitionSupported;
    repeat.querySelector('span')!.textContent = app.busy ? 'Слушаю…' : 'Повторить';
    next.querySelector('span')!.textContent = app.index === words.length - 1 ? 'Новый круг' : 'Следующее слово';
    const notes: string[] = [];
    if (!app.recognitionSupported) notes.push('Распознавание здесь недоступно. Слушайте и повторяйте вместе со взрослым — без автоматической оценки. Для распознавания попробуйте Chrome на компьютере.');
    if (!app.synthesisSupported) notes.push('Озвучка здесь недоступна. Взрослый может прочитать слово вслух.');
    if (!state.storageAvailable) notes.push('Прогресс сохранится только до закрытия или перезагрузки страницы: хранилище браузера недоступно.');
    const capability = root.querySelector<HTMLElement>('.capability-note')!;
    capability.textContent = notes.join(' ');
    capability.hidden = notes.length === 0;
    root.querySelector('.storage-note')!.textContent = state.storageAvailable
      ? 'Текущая карточка и звёзды сохраняются автоматически на этом устройстве.'
      : 'Хранилище недоступно: после перезагрузки прогресс сбросится.';
  });

  return () => {
    unsubscribe();
    listen.removeEventListener('click', onListen);
    repeat.removeEventListener('click', onRepeat);
    next.removeEventListener('click', onNext);
    dialog.removeEventListener('close', onClose);
    dialog.close();
    app.dispose();
    root.replaceChildren();
  };
}
