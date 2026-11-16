import type { Word } from '../data/words';

export function WordCard() {
  const element = document.createElement('div');
  element.className = 'word-visual';
  element.innerHTML = '<div class="illustration"><span class="emoji" role="img"></span></div><h2 id="word"></h2><span class="word-award"></span>';
  const emoji = element.querySelector<HTMLElement>('.emoji')!;
  const heading = element.querySelector('h2')!;
  const award = element.querySelector<HTMLElement>('.word-award')!;
  return {
    element,
    update(word: Word, awarded: boolean) {
      emoji.textContent = word.emoji;
      emoji.setAttribute('aria-label', word.word);
      heading.textContent = word.word;
      award.textContent = awarded ? '★ Звёздочка уже твоя!' : 'Послушай · Повтори · Получи звёздочку';
      award.classList.toggle('earned', awarded);
    },
  };
}
