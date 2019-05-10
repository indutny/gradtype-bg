'use strict';

const { send } = require('micro');
const { promisify } = require('util');

const debug = require('debug')('gradtype:server');

const SECRETS = require('./secrets');
const ROUTES = require('./routes');
const { fetchUser } = require('./db');

async function parseAuth(header) {
  const [ type, token ] = header.split(' ', 2);
  if (type === 'Bearer') {
    return await fetchUser(token);
  }
}

module.exports = async (req, res) => {
  if (req.headers.authorization) {
    try {
      req.user = await parseAuth(req.headers.authorization);
    } catch (e) {
      debug('auth error', e);
      return send(res, 500, { error: 'invalid authorization header' });
    }
  }

  return ROUTES(req, res);
};
