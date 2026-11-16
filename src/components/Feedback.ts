import type { AppState } from '../app';

export function Feedback() {
  const element = document.createElement('div');
  element.className = 'feedback';
  element.setAttribute('role', 'status');
  element.setAttribute('aria-live', 'polite');
  element.setAttribute('aria-atomic', 'true');
  const marker = document.createElement('span');
  marker.className = 'feedback-marker';
  marker.setAttribute('aria-hidden', 'true');
  const text = document.createElement('span');
  element.append(marker, text);
  return {
    element,
    update(state: AppState) {
      element.dataset.phase = state.phase;
      element.classList.toggle('celebrate', state.celebration);
      marker.textContent = state.phase === 'success' ? '★' : state.phase === 'listening' ? '●' : '✦';
      text.textContent = state.message;
    },
  };
}
