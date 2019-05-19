'use strict';

const path = require('path');

const express = require('express');
const { send, json } = require('micro');
const serveStatic = require('serve-static');
const debug = require('debug')('gradtype:app');
const Joi = require('@hapi/joi');

const Storage = require('./storage');
const GitHub = require('./github');
const Google = require('./google');

const DIST = path.join(__dirname, '..', 'dist');

function decorate(handler) {
  return (...args) => {
    handler(...args).catch((e) => {
      debug('unhandled error', e.stack);
      send(args[1], 500, { error: e.message });
    });
  };
}

const SCHEMA = {
  sequence: Joi.object().keys({
    features: Joi.array().min(32).max(128).items(Joi.number()),
    sequence: Joi.array().min(32).max(96).items(Joi.object().keys({
      code: Joi.number(),
      hold: Joi.number(),
      duration: Joi.number(),
    })),
  })
};

module.exports = class App {
  constructor(options = {}) {
    this.storage = new Storage(options.storage);
    this.github = new GitHub(this.storage, options.github);
    this.google = new Google(this.storage, options.google);
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
    [
      { provider: this.github, name: 'github' },
      { provider: this.google, name: 'google' },
    ].forEach(({ provider, name }) => {
      app.get(`/api/auth/${name}`,
         decorate((...args) => this.getAuth(provider, ...args)));
      app.put(`/api/auth/${name}`,
         decorate((...args) => this.putAuth(provider, ...args)));
    });
    app.get('/api/user',
       decorate((...args) => this.getUser(...args)));
    app.put('/api/sequence',
       decorate((...args) => this.putSequence(...args)));
    app.put('/api/redeem',
       decorate((...args) => this.putRedeem(...args)));

    // Static files
    app.use(serveStatic(DIST));

    return app;
  }

  async shutdown() {
    await this.storage.shutdown();
  }

  async getAuth(provider, req, res) {
    try {
      const url = await provider.getAuthURL();
      return send(res, 200, { url });
    } catch (e) {
      debug('get auth url error', e);
      return send(res, 500, { error: 'server error', details: e.message });
    }
  }

  async putAuth(provider, req, res) {
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
      token = await provider.fetchToken(code);
    } catch (e) {
      debug('fetch token error', e);
      return send(res, 500, { error: 'can\'t fetch auth token' });
    }

    let user;
    try {
      user = await provider.fetchUser(token);
    } catch (e) {
      debug('fetch user error', e);
      return send(res, 500, { error: 'can\'t fetch auth user' });
    }

    let authToken;
    try {
      authToken = await this.storage.storeUser({
        type: provider.type,
        id: provider.type + ':' + user.login,
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
    if (!req.user) {
      return send(res, 401, { error: 'Not authorized' });
    }

    const body = await json(req);
    const { error, value } = SCHEMA.sequence.validate(body);
    if (error) {
      return send(res, 400, { error: error.message });
    }

    const info = await this.storage.storeSequence(req.user.id, value.sequence);

    send(res, 200, Object.assign({}, info, { }));
  }

  async putRedeem(req, res) {
    const body = await json(req);
    if (!body || !body.code) {
      return send(res, 400, { error: 'invalid body' });
    }

    const redeemed = await this.storage.redeem(body.code);
    if (!redeemed) {
      return send(res, 400, { error: 'invalid code' });
    }

    send(res, 200, Object.assign({ ok: true }));
  }
}
