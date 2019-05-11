'use strict';

const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID;
const GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET;

if (!GITHUB_CLIENT_ID) {
  throw new Error('`GITHUB_CLIENT_ID` env variable not set');
}

if (!GITHUB_CLIENT_SECRET) {
  throw new Error('`GITHUB_CLIENT_SECRET` env variable not set');
}

exports.GITHUB_CLIENT_ID = GITHUB_CLIENT_ID;
exports.GITHUB_CLIENT_SECRET = GITHUB_CLIENT_SECRET;
exports.REDIS_URL = process.env.REDIS_URL;
