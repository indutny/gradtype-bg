'use strict';

const fs = require('fs');

const Storage = require('../backend/storage');

async function run(config) {
  const s = new Storage(config.storage);
  await s.init();
  await s.shutdown();

  const seqs = [];
  for (const [ userId, list ] of s.features) {
    for (const features of list) {
      seqs.push({ category: userId, features });
    }
  }
  console.log(JSON.stringify({ train: seqs, validate: [] }));
}

const config = process.argv[2] ?
  JSON.parse(fs.readFileSync(process.argv[2]).toString()) :
  {};

run(config);
