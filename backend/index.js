'use strict';

const cluster = require('cluster');
const os = require('os');

if (cluster.isMaster) {
  function start() {
    const worker = cluster.fork();
    worker.once('exit', () => {
      setTimeout(start, 50);
    });
  }

  for (let i = 0; i < os.cpus().length; i++) {
    start();
  }
  return;
}

const fs = require('fs');
const App = require('./app');

const config = process.argv[2] ?
  JSON.parse(fs.readFileSync(process.argv[2]).toString()) : {};

async function run() {
  const app = new App(config);

  const server = await app.getServer();

  server.listen(config.port || 8000, function() {
    console.error('Listening on %j', this.address());
  });
}

run().catch((e) => {
  console.error(e.stack);
  process.exit(1);
});
