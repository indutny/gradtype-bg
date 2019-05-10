'use strict';

const { dumpFeatures } = require('../backend/db');

dumpFeatures().then((features) => {
  console.log(JSON.stringify(features));
  process.exit(0);
});
