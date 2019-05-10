const { send, json } = require('micro');
const { router, get } = require('microrouter');
const { promisify } = require('util');

const debug = require('debug')('gradtype:routes');

const { getAuthURL, fetchToken, fetchUser } = require('./github');
const { checkNonce, getToken } = require('./db');

const SECRETS = require('./secrets');

async function authGithub(req, res) {
  try {
    return { url: await getAuthURL() };
  } catch (e) {
    debug('get auth url error', e);
    return send(res, 500, { error: 'server error' });
  }
}

async function authGithubCallback(req, res) {
  const code = req.query.code;
  if (!code) {
    return send(res, 400, { error: 'missing `code` in query' });
  }

  const state = req.query.state;
  if (!checkNonce(state)) {
    return send(res, 400, { error: 'invalid nonce' });
  }

  let token;
  try {
    token = await fetchToken(code);
  } catch (e) {
    debug('fetch token error', e);
    return send(res, 500, { error: 'can\'t fetch github token' });
  }

  let user;
  try {
    user = await fetchUser(token);
  } catch (e) {
    debug('fetch user error', e);
    return send(res, 500, { error: 'can\'t fetch github user' });
  }

  try {
    return {
      bearer: await getToken({ type: 'github', user }),
    };
  } catch (e) {
    debug('db get token error', e);
    return send(res, 500, { error: 'failed to sign bearer token' });
  }
}

async function user(req, res) {
  return { user: req.user };
}

module.exports = router(
  get('/auth/github', authGithub),
  get('/auth/github/callback', authGithubCallback),
  get('/user', user),
);
