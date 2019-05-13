import RAW_SENTENCES from '../data/sentences';

// Time in milliseconds to wait for keyup on sentence completion
const RELEASE_DELAY = 100;

const SENTENCES = RAW_SENTENCES.map((sentence) => {
  return sentence.toLowerCase();
});

export default class Typist {
  constructor(elem) {
    this.elem = elem || document.createElement('div');
    this.complete = document.createElement('span');
    this.pending = document.createElement('span');

    this.elem.appendChild(this.complete);
    this.elem.appendChild(this.pending);

    this.elem.classList.add('typist');
    this.complete.classList.add('typist-completed');
    this.pending.classList.add('typist-pending');

    this.listeners = {
      keydown: (e) => {
        if (e.metaKey || e.altKey || e.ctrlKey) {
          return;
        }

        this.onKeyDown(e.key);
        e.preventDefault();
        return false;
      },
      keyup: (e) => {
        if (e.metaKey || e.altKey || e.ctrlKey) {
          return;
        }

        this.onKeyUp(e.key);
        e.preventDefault();
        return false;
      },
    };

    this.onFlush = null;

    this.reset();
  }

  reset() {
    // Currently pressed keys
    this.pressed = new Set();

    // Is `flush()` pending?
    this.pendingFlush = false;

    // Number of finished sentences
    this.finished = 0;

    // Current sentence index
    this.sentence = (Math.random() * SENTENCES.length) | 0;

    // Current letter index
    this.letter = 0;

    // List of all events for current sentence
    this.log = [];

    this.update();
  }

  update() {
    const sentence = SENTENCES[this.sentence];
    const complete = sentence.slice(0, this.letter);
    const pending = sentence.slice(this.letter);

    this.complete.textContent = complete;
    this.pending.textContent = pending;
  }

  start() {
    window.addEventListener('keydown', this.listeners.keydown, true);
    window.addEventListener('keyup', this.listeners.keyup, true);
  }

  stop() {
    window.removeEventListener('keydown', this.listeners.keydown);
    window.removeEventListener('keyup', this.listeners.keyup);
  }

  flush() {
    const log = this.log;
    this.log = [];

    this.pendingFlush = false;
    this.onFlush(RAW_SENTENCES[this.sentence], log);
  }

  onKeyDown(key) {
    const now = Date.now() / 1000;
    this.log.push({ type: 'down', now, key });

    const sentence = SENTENCES[this.sentence];

    const expected = sentence[this.letter];
    if (key !== expected) {
      return;
    }

    this.pressed.add(key);

    // Next letter
    this.letter++;
    if (this.letter === sentence.length) {
      this.pendingFlush = true;
    } else {
      this.update();
    }
  }

  onKeyUp(key) {
    const now = Date.now() / 1000;
    this.log.push({ type: 'up', now, key });

    this.pressed.delete(key);
    if (this.pendingFlush && this.pressed.size === 0) {
      this.flush();

      // Next sentence
      this.letter = 0;
      this.sentence = (this.sentence + 1) % SENTENCES.length;

      this.update();
    }
  }
}
