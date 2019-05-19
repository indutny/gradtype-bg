import API from './api';
import Typist from './typist';
import { filter } from './utils';

class App {
  constructor() {
    this.api = new API();
    this.typist = new Typist(document.getElementById('typist'));

    this.elem = document.getElementById('app');

    this.stats = document.getElementById('info-stats');

    this.login = document.getElementById('login');
    this.logout = document.getElementById('logout');

    this.login.addEventListener('click', (e) => {
      e.preventDefault();

      this.api.auth('google').then(() => {
        this.login.disabled = true;
        this.logout.disabled = false;
        this.typist.start();
      });
    });
    this.logout.addEventListener('click', (e) => {
      e.preventDefault();

      this.api.logout().then(() => {
        this.login.disabled = false;
        this.logout.disabled = true;
        this.typist.stop();
      });
    });

    this.api.getUser().then((user) => {
      this.login.disabled = !!user;
      this.logout.disabled = !user;

      if (user) {
        this.typist.start();
      }
    });

    this.typist.onFlush = (sentence, log) => {
      this.onLog(sentence, log).catch((e) => {
        this.stats.textContent = e.message;
      });
    };
  }

  async onLog(sentence, log) {
    const sequence = filter(sentence, log);

    this.stats.textContent = 'Submitting...';

    const res = await this.api.sendSequence(sequence);
    if (res.sequenceCount !== undefined) {
      const stars = Math.min(5, Math.floor((res.sequenceCount / 60) * 5));
      const missing = 5 - stars;

      this.stats.textContent = 'Sentences stored: ' + res.sequenceCount +
        ', Rating: ' + '⭐️'.repeat(stars) + '🔹'.repeat(missing);

      if (res.code) {
        this.stats.textContent += ', your MTurk code is: ' + res.code;
      }
    } else {
      this.stats.textContent = '';
    }
  }
}

const app = new App();
