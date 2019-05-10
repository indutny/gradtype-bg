import WEIGHTS from '../data/weights';
import INDUTNY from '../data/indutny';

import Model from './model';
import Typist from './typist';
import { distance, filter } from './utils';

const CUTOFF = 1.6291852466234173;
const NEIGHBORS = 20;

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

    this.info = document.createElement('section');
    this.info.classList.add('info');
    this.elem.appendChild(this.info);

    this.typist.onFlush = (sentence, log) => this.onLog(sentence, log);

    this.total = 0;

    this.typist.start();
  }

  onLog(sentence, log) {
    const events = filter(sentence, log);
    const features = this.model.call(events);

    console.log(JSON.stringify(features));

    let distances = [];
    for (const sample of INDUTNY) {
      distances.push(distance(features, sample));
    }

    distances.sort();
    distances = distances.slice(0, NEIGHBORS);

    let mean = 0;
    for (const d of distances) {
      mean += d;
    }
    mean /= distances.length;
    mean /= CUTOFF;

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
