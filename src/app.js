import Model from './model';
import weights from '../data/weights';

export default class App {
  constructor() {
    this.model = new Model(weights);
  }
}
