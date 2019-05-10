import WEIGHTS from '../data/weights';
import INDUTNY from '../data/indutny';

import API from './api';
import Typist from './typist';
import { filter } from './utils';

class App {
  constructor() {
    this.api = new API();
    this.typist = new Typist(document.getElementById('typist'));

    this.elem = document.getElementById('app');

    this.result = document.getElementById('info-result');
    this.stars = document.getElementById('info-stars');
    this.stats = document.getElementById('info-stats');

    this.login = document.getElementById('login');
    this.logout = document.getElementById('logout');

    this.login.addEventListener('click', (e) => {
      e.preventDefault();

      this.api.auth().then(() => {
        this.login.disabled = true;
        this.logout.disabled = false;
      });
    });
    this.logout.addEventListener('click', (e) => {
      e.preventDefault();

      this.api.logout().then(() => {
        this.login.disabled = false;
        this.logout.disabled = true;
      });
    });

    this.api.getUser().then((user) => {
      this.login.disabled = !!user;
      this.logout.disabled = !user;
    });

    this.typist.onFlush = (sentence, log) => {
      this.onLog(sentence, log).catch((e) => {
        console.error(e);
      });
    };

    this.typist.start();
  }

  async onLog(sentence, log) {
    const events = filter(sentence, log);

    this.stats.textContent = 'Submitting...';
    this.result.textContent = '...';

    const res = await this.api.sendFeatures(events);
    if (res.featureCount !== undefined) {
      const stars = Math.min(5, Math.round((res.featureCount / 60) * 5));
      const missing = 5 - stars;

      this.stars.textContent = '⭐️'.repeat(stars) + '🔹'.fill(missing);
      this.stats.textContent = 'Sentences stored: ' + res.featureCount;
    } else {
      this.stars.textContent = '';
      this.stats.textContent = '';
    }

    let text;
    if (res.results.length < 0) {
      this.result.textContent = 'No users found';
      return;
    }

    this.result.textContent = '';
    for (const result of res.results) {
      const p = document.createElement('p');
      p.textContent = `"${result.user.id}" - ${result.distance}`;
      this.result.appendChild(p);
    }
  }
}

const app = new App();
