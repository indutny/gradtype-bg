'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const Storage = require('../backend/storage');
const SENTENCES = require('../data/sentences');

const SECRET_KEY = process.env.SECRET_KEY;
if (!SECRET_KEY) {
  throw new Error('Can\'t mask logins without `SECRET_KEY`');
}

async function run(config, outDir) {
  const s = new Storage(config.storage);
  for (const { userId, sequences } of await s.getAllSequences()) {
    const [ provider ] = userId.split(':', 1);

    const hmac = crypto.createHmac('sha256', SECRET_KEY)
      .update(userId)
      .digest('hex').slice(0, 8);

    const label = 'wb-mturk-' + hmac;
    const content = JSON.stringify({
      version: 2,
      label,
      sequences,
    });

    fs.writeFileSync(path.join(outDir, label + '.json'), content);
  }
  await s.shutdown();
}

const config = process.argv[2] ?
  JSON.parse(fs.readFileSync(process.argv[2]).toString()) :
  {};

run(config, process.argv[3] || '/tmp');
