'use strict';

const { dumpFeatures } = require('../backend/db');

dumpFeatures().then((result) => {
  const seqs = [];
  for (const { userId, features } of result) {
    for (const elem of features) {
      seqs.push({ category: userId, features: elem });
    }
  }
  console.log(JSON.stringify({ validate: seqs }));
  process.exit(0);
});
