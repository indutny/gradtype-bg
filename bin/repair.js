'use strict';

const fs = require('fs');

const Storage = require('../backend/storage');

async function run(config) {
  const s = new Storage(config.storage);
  await s.repair();
  await s.shutdown();
}

const config = process.argv[2] ?
  JSON.parse(fs.readFileSync(process.argv[2]).toString()) :
  {};

run(config);
