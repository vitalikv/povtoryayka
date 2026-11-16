import { words } from '../data/words';

export function ProgressBar() {
  const element = document.createElement('div');
  element.className = 'round-progress';
  element.innerHTML = '<div class="progress-caption"><span>Наш маленький круг</span><span class="progress-count"></span></div><div class="progress-track" role="progressbar" aria-label="Звёзды в текущем круге" aria-valuemin="0" aria-valuemax="20"><div class="progress-fill"></div></div>';
  const count = element.querySelector<HTMLElement>('.progress-count')!;
  const track = element.querySelector<HTMLElement>('.progress-track')!;
  const fill = element.querySelector<HTMLElement>('.progress-fill')!;
  return {
    element,
    update(awarded: number) {
      count.textContent = `${awarded} из ${words.length} звёзд`;
      track.setAttribute('aria-valuenow', String(awarded));
      fill.style.width = `${awarded / words.length * 100}%`;
    },
  };
}
