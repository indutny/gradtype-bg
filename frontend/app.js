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

    this.pass = document.createElement('section');
    this.pass.classList.add('pass');
    this.elem.appendChild(this.pass);

    this.info = document.createElement('section');
    this.info.classList.add('info');
    this.elem.appendChild(this.info);

    this.login = document.createElement('button');
    this.login.textContent = 'Log In';
    this.login.addEventListener('click', (e) => {
      e.preventDefault();

      this.api.auth();
    });
    this.elem.appendChild(this.login);

    this.typist.onFlush = (sentence, log) => {
      this.onLog(sentence, log).catch((e) => {
        console.error(e);
      });
    };

    this.total = 0;

    this.typist.start();
  }

  async onLog(sentence, log) {
    const events = filter(sentence, log);

    const res = await fetch({
    });

    let text;
    if (mean > 1) {
      text = 'You are not "indutny" with distance: ' +
        mean.toFixed(3);
    } else {
      text = 'You are "indutny" with distance:' +
        mean.toFixed(3);
    }
    this.pass.textContent = text;

    this.total++;
    this.info.textContent = 'Total sentences typed: ' + this.total;
  }
}

const app = new App();
document.body.appendChild(app.elem);
