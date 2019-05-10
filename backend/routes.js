const { send, json } = require('micro');
const { router, get, put } = require('microrouter');
const { promisify } = require('util');

const debug = require('debug')('gradtype:routes');

const { getAuthURL, fetchToken, fetchUser } = require('./github');
const db = require('./db');
const model = require('./model');

const SECRETS = require('./secrets');

async function authGithub(req, res) {
  try {
    const url = await getAuthURL();
    return { url };
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
  if (!db.checkNonce(state)) {
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

  let authToken;
  try {
    authToken = await db.getToken({
      type: 'github',
      id: 'github:' + user.login,
      user,
    });
  } catch (e) {
    debug('db get token error', e);
    return send(res, 500, { error: 'failed to sign bearer token' });
  }

  return { token: authToken };
}

async function user(req, res) {
  return { user: req.user };
}

async function features(req, res) {
  if (!req.user) {
    return send(res, 401, { error: 'not authorized' });
  }

  const body = await json(req);
  if (!body || !Array.isArray(body.events)) {
    return send(res, 400, { error: 'missing events array' });
  }

  let features;
  try {
    features = model.call(body.events);
  } catch (e) {
    return send(res, 400, { error: 'invalid events array' });
  }

  const [ info, results ] = await Promise.all(
    db.addFeatures(req.user, features, body.events),
    db.searchFeatures(features),
  );
  return Object.extend({}, info, { results });
}

module.exports = router(
  get('/auth/github', authGithub),
  get('/auth/github/callback', authGithubCallback),
  get('/user', user),
  put('/features', features),
);
