'use strict';

const MAX_NONCES = 1024 * 1024;
const MAX_USERS = 1024 * 1024;

const crypto = require('crypto');

const nonces = new Set();
const users = new Map();

exports.getNonce = async () => {
  if (nonces.size === MAX_NONCES) {
    const first = nonces.values().next().value;
    nonces.delete(first);
  }

  const nonce = crypto.randomBytes(16).toString('hex');
  nonces.add(nonce);
  return nonce;
};

exports.checkNonce = async (nonce) => {
  if (!nonces.has(nonce)) {
    return false;
  }

  nonces.delete(nonce);
  return true;
};

exports.fetchUser = async (token) => {
  return users.get(token);
};

exports.getToken = async (user) => {
  if (users.size === MAX_USERS) {
    const first = users.keys().next().value;
    users.delete(first);
  }

  const token = crypto.randomBytes(24).toString('base64');
  users.set(token, user);
  return token;
};
