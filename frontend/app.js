import WEIGHTS from '../data/weights';
import INDUTNY from '../data/indutny';

import API from './api';
import Typist from './typist';
import { filter } from './utils';

class App {
  constructor() {
    this.api = new API();
    this.typist = new Typist();

    this.elem = document.createElement('section');
    this.elem.classList.add('app');
    this.elem.appendChild(this.typist.elem);

    this.result = document.createElement('section');
    this.result.classList.add('result');
    this.elem.appendChild(this.result);

    this.info = document.createElement('section');
    this.info.classList.add('info');
    this.elem.appendChild(this.info);

    this.login = document.createElement('button');
    this.login.textContent = 'Log In';
    this.login.addEventListener('click', (e) => {
      e.preventDefault();

      this.api.auth().then(() => {
      });
    });
    this.elem.appendChild(this.login);

    this.typist.onFlush = (sentence, log) => {
      this.onLog(sentence, log).catch((e) => {
        console.error(e);
      });
    };

    this.typist.start();
  }

  async onLog(sentence, log) {
    const events = filter(sentence, log);

    const res = await this.api.sendFeatures(events);
    this.info.textContent = 'Total sentences typed: ' + res.featureCount;

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
document.body.appendChild(app.elem);
