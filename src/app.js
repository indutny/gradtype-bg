import WEIGHTS from '../data/weights';
import INDUTNY from '../data/indutny';

import Model from './model';
import Typist from './typist';
import { distance, filter } from './utils';

class App {
  constructor() {
    this.model = new Model(WEIGHTS);
    this.typist = new Typist();

    this.elem = document.createElement('section');
    this.elem.classList.add('app');
    this.elem.appendChild(this.typist.elem);

    this.pass = document.createElement('section');
    this.pass.classList.add('pass');
    this.elem.appendChild(this.pass);

    this.typist.onFlush = (sentence, log) => this.onLog(sentence, log);

    this.typist.start();
  }

  onLog(sentence, log) {
    const events = filter(sentence, log);
    const features = this.model.call(events);

    console.log(JSON.stringify(features));

    let pass = 0;
    for (const sample of INDUTNY) {
      if (distance(features, sample) < 1.7154806850871354) {
        pass++;
      }
    }
    pass /= INDUTNY.length;

    let text;
    if (pass < 0.5) {
      text = 'You are not "indutny" with confidence:' +
        ((1 - pass) * 100).toFixed(1);
    } else {
      text = 'You are "indutny" with confidence:' +
        (pass * 100).toFixed(1);
    }
    this.pass.textContent = text;
  }
}

const app = new App();
document.body.appendChild(app.elem);
