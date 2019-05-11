'use strict';

const path = require('path');

const express = require('express');
const { send, json } = require('micro');
const serveStatic = require('serve-static');
const debug = require('debug')('gradtype:app');

const Storage = require('./storage');
const GitHub = require('./github');

const DIST = path.join(__dirname, '..', 'dist');

function decorate(handler) {
  return (...args) => {
    handler(...args).catch((e) => {
      debug('unhandled error', e.stack);
      send(args[1], 500, { error: e.message });
    });
  };
}

module.exports = class App {
  constructor(options = {}) {
    this.storage = new Storage(options.storage);
    this.github = new GitHub(this.storage, options.github);
  }

  async getServer() {
    await this.storage.init();

    const app = express();

    // Authenticate requests
    app.use(decorate(async (req, res, next) => {
      if (!req.headers.authorization) {
        return next();
      }

      const [ type, token ] = req.headers.authorization.split(' ', 2);
      if (type !== 'Bearer') {
        return next();
      }

      try {
        req.user = await this.storage.getUserByToken(token);
      } catch (e) {
        debug('auth error', e);
        return send(res, 500, {
          error: 'invalid authorization header',
          details: e.message,
        });
      }

      next();
    }));

    // Routes
    app.get('/api/auth/github',
       decorate((...args) => this.getAuthGithub(...args)));
    app.put('/api/auth/github',
       decorate((...args) => this.putAuthGithub(...args)));
    app.get('/api/user',
       decorate((...args) => this.getUser(...args)));
    app.put('/api/sequence',
       decorate((...args) => this.putSequence(...args)));

    // Static files
    app.use(serveStatic(DIST));

    return app;
  }

  async shutdown() {
    await this.storage.shutdown();
  }

  async getAuthGithub(req, res) {
    try {
      const url = await this.github.getAuthURL();
      return send(res, 200, { url });
    } catch (e) {
      debug('get auth url error', e);
      return send(res, 500, { error: 'server error', details: e.message });
    }
  }

  async putAuthGithub(req, res) {
    const body = await json(req);
    if (!body || !body.code || !body.state) {
      return send(res, 400, { error: 'missing `code` and `state` in body' });
    }

    const code = body.code.toString();
    const state = body.state.toString();
    if (!this.storage.checkNonce(state)) {
      return send(res, 400, { error: 'invalid nonce' });
    }

    let token;
    try {
      token = await this.github.fetchToken(code);
    } catch (e) {
      debug('fetch token error', e);
      return send(res, 500, { error: 'can\'t fetch github token' });
    }

    let user;
    try {
      user = await this.github.fetchUser(token);
    } catch (e) {
      debug('fetch user error', e);
      return send(res, 500, { error: 'can\'t fetch github user' });
    }

    let authToken;
    try {
      authToken = await this.storage.storeUser({
        type: 'github',
        id: 'github:' + user.login,
        user,
      });
    } catch (e) {
      debug('storage get token error', e);
      return send(res, 500, { error: 'failed to sign bearer token' });
    }

    send(res, 200, { token: authToken });
  }

  async getUser(req, res) {
    send(res, 200, { user: req.user });
  }

  async putSequence(req, res) {
    const body = await json(req);
    if (!body || !Array.isArray(body.sequence)) {
      return send(res, 400, { error: 'missing `sequence` array' });
    }

    if (!Array.isArray(body.features)) {
      return send(res, 400, { error: 'missing `features` array' });
    }

    const results = await this.storage.search(body.features);
    let info;
    if (req.user) {
      info = await this.storage.storeSequence(req.user.id, body.sequence);
    }

    send(res, 200, Object.assign({}, info, { results }));
  }
}
