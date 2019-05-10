'use strict';

const MAX_NONCES = 1024 * 1024;
const MAX_USERS = 1024 * 1024;
const MAX_RESULTS = 5;

const model = require('./model');

const crypto = require('crypto');

const nonces = new Set();
const usersByToken = new Map();
const usersById = new Map();
const featuresByUser = new Map();

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
  return usersByToken.get(token);
};

exports.getToken = async (user) => {
  if (usersByToken.size === MAX_USERS) {
    const first = usersByToken.keys().next().value;
    usersByToken.delete(first);
  }

  usersById.set(user.id, user);

  const token = crypto.randomBytes(24).toString('base64');
  usersByToken.set(token, user);
  return token;
};

exports.addFeatures = async (user, features, events) => {
  let storage;
  if (featuresByUser.has(user.id)) {
    storage = featuresByUser.get(user.id);
  } else {
    storage = { events: [], features: [] };
    featuresByUser.set(user.id, storage);
  }

  storage.events.push(events);
  storage.features.push(features);

  return { featureCount: storage.features.length };
};

exports.searchFeatures = async (features) => {
  const matches = [];
  for (const [ userId, storage ] of featuresByUser) {
    const distance = model.computeDistance(features, storage.features);
    if (distance < 1) {
      matches.push({ distance, user: usersById.get(userId) });
    }
  }

  matches.sort((a, b) => a.distance - b.distance);
  return matches.slice(0, MAX_RESULTS);
};
