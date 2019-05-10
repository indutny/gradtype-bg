'use strict';

const { send } = require('micro');

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
  // TODO(indutny): be strict
  res.setHeader('access-control-allow-origin', '*');
  res.setHeader('access-control-allow-methods', 'GET,PUT');
  res.setHeader('access-control-allow-headers', 'content-type,authorization');

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
