'use strict';

const fs = require('fs');
const fetch = require('node-fetch');

const CSV = fs.readFileSync(process.argv[2]).toString();

async function redeem(code) {
  const res = await fetch('https://gradtype-mturk.darksi.de/api/redeem', {
    method: 'PUT',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify({ code }),
  });

  const body = await res.json();
  if (!body.ok) {
    return code;
  }
}

async function start() {
  const codes = [];
  CSV.replace(/[a-f0-9]{64,64}/g, (code) => {
    codes.push(code);
  });

  let results = await Promise.all(codes.map(redeem));
  results = results.filter((result) => result);

  console.log('Invalid codes:', results);
  console.log('Correct codes:', codes.length - results.length);
}

start().catch((e) => {
  console.error(e.stack);
  process.exit(1);
});
