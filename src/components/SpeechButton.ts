export const icons = {
  sound: '<path d="m11 5-6 4H2v6h3l6 4V5Z"/><path d="M15 8a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14"/>',
  mic: '<rect x="9" y="2" width="6" height="13" rx="3"/><path d="M5 10v2a7 7 0 0 0 14 0v-2M12 19v3m-4 0h8"/>',
  arrow: '<path d="M4 12h16m-6-6 6 6-6 6"/>',
  star: '<path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9L12 3Z"/>',
  leaf: '<path d="M20 3C8 1 2 8 6 15s16 3 14-12ZM4 21 16 9"/>',
};
export function icon(name: keyof typeof icons): string {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[name]}</svg>`;
}

export function SpeechButton(text: string, name: keyof typeof icons, className: string): HTMLButtonElement {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = className;
  button.innerHTML = `${icon(name)}<span></span>`;
  button.querySelector('span')!.textContent = text;
  return button;
}
