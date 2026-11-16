import './style.css';
import { AppController } from './app';
import { SpeechRecognitionService } from './services/speechRecognition';
import { SpeechSynthesisService } from './services/speechSynthesis';
import { mountApp } from './view';

const app = new AppController(new SpeechRecognitionService(), new SpeechSynthesisService());
const unmount = mountApp(document.querySelector<HTMLDivElement>('#app')!, app);
const pauseWhenHidden = () => { if (document.hidden) app.pause(); };
const pauseOnLeave = () => app.pause();
document.addEventListener('visibilitychange', pauseWhenHidden);
window.addEventListener('pagehide', pauseOnLeave);

if (import.meta.hot) import.meta.hot.dispose(() => {
  document.removeEventListener('visibilitychange', pauseWhenHidden);
  window.removeEventListener('pagehide', pauseOnLeave);
  unmount();
  app.dispose();
});
