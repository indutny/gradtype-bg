'use strict';

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
