'use strict';

const SECRETS = require('./secrets');

const promisify = require('util').promisify;
const redis = require('redis').createClient(SECRETS.REDIS_URL);

redis.getAsync = promisify(redis.get);
redis.setAsync = promisify(redis.set);
redis.setexAsync = promisify(redis.setex);
redis.delAsync = promisify(redis.del);
redis.lpushAsync = promisify(redis.lpush);
redis.llenAsync = promisify(redis.llen);
redis.lrangeAsync = promisify(redis.lrange);
redis.hgetAsync = promisify(redis.hget);
redis.hsetAsync = promisify(redis.hset);
redis.hkeysAsync = promisify(redis.hkeys);

const NONCE_SIZE = 16;
const NONCE_EXPIRATION = 300;
const TOKEN_SIZE = 24;
const TOKEN_EXPIRATION = 7 * 24 * 3600;
const MAX_RESULTS = 5;

const model = require('./model');

const crypto = require('crypto');

exports.getNonce = async () => {
  const nonce = crypto.randomBytes(NONCE_SIZE).toString('hex');
  await redis.setexAsync('gradtype:nonce:' + nonce, NONCE_EXPIRATION, '1');
  return nonce;
};

exports.checkNonce = async (nonce) => {
  if (!/^[a-f0-9]+$/.test(nonce)) {
    return false;
  }

  const present = await redis.getAsync('gradtype:nonce:' + nonce);
  await redis.getAsync('gradtype:nonce:' + nonce);
  await redis.delAsync('gradtype:nonce:' + nonce);
  return !!present;
};

exports.fetchUser = async (token) => {
  const id = await redis.getAsync('gradtype:user-by-token:' + token);
  if (!id) {
    return undefined;
  }
  const json = await redis.hgetAsync('gradtype:user', id);
  return JSON.parse(json);
};

exports.getToken = async (user) => {
  const token = crypto.randomBytes(TOKEN_SIZE).toString('base64');

  await redis.hsetAsync('gradtype:user', user.id, JSON.stringify(user));
  await redis.setexAsync('gradtype:user-by-token:' + token,
    TOKEN_EXPIRATION, user.id);

  return token;
};

exports.addFeatures = async (user, features, events) => {
  await redis.lpushAsync('gradtype:events:' + user.id,
    JSON.stringify(events));
  const len = await redis.lpushAsync('gradtype:features:' + user.id,
    JSON.stringify(features));

  return { featureCount: len };
};

exports.searchFeatures = async (features) => {
  const users = await redis.hkeysAsync('gradtype:user');

  const matches = [];
  await Promise.all(users.map(async (userId) => {
    const storedLen = await redis.llenAsync('gradtype:features:' + userId);
    let storedFeatures = await redis.lrangeAsync('gradtype:features:' + userId,
      0, storedLen);

    storedFeatures = storedFeatures.map((json) => JSON.parse(json));

    const distance = model.computeDistance(features, storedFeatures);
    if (distance < 1) {
      const json = await redis.hgetAsync('gradtype:user', userId);
      const user = JSON.parse(json);
      matches.push({ distance, user });
    }
  }));

  matches.sort((a, b) => a.distance - b.distance);
  return matches.slice(0, MAX_RESULTS);
};

exports.dumpFeatures = async () => {
  const users = await redis.hkeysAsync('gradtype:user');

  const matches = [];
  return await Promise.all(users.map(async (userId) => {
    const storedLen = await redis.llenAsync('gradtype:features:' + userId);
    let storedFeatures = await redis.lrangeAsync('gradtype:features:' + userId,
      0, storedLen);

    storedFeatures = storedFeatures.map((json) => JSON.parse(json));
    return {
      userId,
      features: storedFeatures,
    };
  }));
};
