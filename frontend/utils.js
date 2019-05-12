// NOTE: not using esm here for compatibility with backend

function compress(code) {
  // 'abcdefghijklmnopqrstuvwxyz ,.'
  // a - z
  if (0x61 <= code && code <= 0x7a) {
    return code - 0x61;

  // A - Z
  } else if (0x41 <= code && code <= 0x5a) {
    return code - 0x41;

  // ' '
  } else if (code === 0x20) {
    return 26;

  // ','
  } else if (code === 0x2c) {
    return 27;

  // '.'
  } else if (code === 0x2e) {
    return 28;
  } else {
    throw new Error('Unexpected code: ' + code.toString(16));
  }
}
exports.compress = compress;

function decompress(code) {
  // 'abcdefghijklmnopqrstuvwxyz ,.'
  // a - z
  if (0 <= code && code < 26) {
    code += 0x61;

  // ' '
  } else if (code === 26) {
    code = 0x20;

  // ','
  } else if (code === 27) {
    code = 0x2c;

  // '.'
  } else if (code === 28) {
    code = 0x2e;
  } else {
    throw new Error('Unexpected code: ' + code);
  }

  return String.fromCharCode(code);
}
exports.decompress = decompress;

exports.filter = function filter(sentence, events) {
  sentence = sentence.toLowerCase();

  const filtered = [];

  let index = 0;

  // Filter events
  const pressed = new Set();
  for (const event of events) {
    const key = event.key;
    const type = event.type;

    const letter = sentence[index];

    if (type === 'down' && key === letter) {
      if (/^[a-zA-Z ,\.]$/.test(key)) {
        pressed.add(key);
        filtered.push(event);
      }

      index++;
    } else if (type === 'up' && pressed.has(key)) {
      pressed.delete(key);
      filtered.push(event);
    }
  }

  const info = new Map();

  const sequence = [];
  for (const [ i, event ] of filtered.entries()) {
    if (event.type === 'down') {
      let j = i + 1;
      let next = event;
      for (let j = i + 1; j < filtered.length; j++) {
        const entry = filtered[j];
        if (entry.type === 'down') {
          next = entry;
          break;
        }
      }

      // Time delta between two presses
      const duration = next.now - event.now;
      const reserve = { code: null, hold: null, duration: null };
      info.set(event.key, { duration, start: event.now, reserve });
      sequence.push(reserve);
      continue;
    }

    const prev = info.get(event.key);
    const hold = event.now - prev.start;
    info.delete(event.key);
    Object.assign(prev.reserve, {
      code: compress(event.key.charCodeAt(0)),
      hold,
      duration: prev.duration,
    });
  }

  return sequence.filter((elem) => {
    return elem.duration !== null && elem.hold !== null &&
      elem.duration !== null;
  });
}
