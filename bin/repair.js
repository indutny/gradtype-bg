'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const Storage = require('../backend/storage');

function repair(userId, seq) {
  const sentence = seq.map((event) => decompress(event.code)).join('');

  const distances = SENTENCES.map((original) => {
    return {
      original,
      distance: levenshtein.get(original, sentence),
    };
  });
  distances.sort((a, b) => a.distance - b.distance);

  const match = distances[0];
  assert(match.distance < 10, userId + ': ' + sentence);

  if (match.distance === 0) {
    return seq;
  }

  const out = [];
  const original = match.original;
  for (let i = 0; i < original.length; i++) {
    const expected = original[i];
    for (let j = 0; j < sentence.length; j++) {
      if (expected === sentence[j]) {
        out.push(seq[j]);
      }
    }
  }

  return out;
}

async function run(config) {
  const s = new Storage(config.storage);
  for (const { userId, sequences } of await s.getAllSequences()) {
    for (let seq of sequences) {
      seq = repair(userId, seq);

      s.
    }
  }
  await s.shutdown();
}

const config = process.argv[2] ?
  JSON.parse(fs.readFileSync(process.argv[2]).toString()) :
  {};

run(config);
