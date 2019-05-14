'use strict';

const assert = require('assert');
const crypto = require('crypto');
const { promisify } = require('util');

const LRU = require('lru-cache');
const redis = require('redis');
const levenshtein = require('fast-levenshtein');

const Model = require('./model');
const WEIGHTS = require('../data/weights');
const SENTENCES = require('../data/sentences').map((sentence) => {
  return sentence.toLowerCase().replace(/[^a-z,. ]/g, '');
});
const { compress, decompress } = require('../frontend/utils');

const REDIS_METHODS = [
  'get', 'set', 'setex', 'del', 'rename',
  'lpush', 'lrange', 'llen',
  'hget', 'hset', 'hkeys',
];

const NONCE_SIZE = 16;
const NONCE_EXPIRATION = 300;
const TOKEN_SIZE = 24;
const TOKEN_EXPIRATION = 7 * 24 * 3600;
const MAX_RESULTS = 5;
const MAX_SEQUENCES = 90;

const MIN_REPAIR_OUT_LEN = 0.75;

const NONCE_PREFIX = 'gradtype:nonce:';
const USER_BY_TOKEN_PREFIX = 'gradtype:user-by-token:';
const USER_HMAP = 'gradtype:user';
const USER_PREFIX = 'gradtype:user:';  // only for LRU
const EVENTS_BY_USER_PREFIX = 'gradtype:events:';
const REPAIR_BY_USER_PREFIX = 'gradtype:repair:';

module.exports = class Storage {
  constructor(options = {}) {
    this.lru = new LRU({
      max: 100000,
    });

    this.model = new Model(WEIGHTS);
    this.redis = redis.createClient(options.redis);

    // TODO(indutny): subscribe to redis changes!!
    // userId => featureList
    this.features = new Map();

    for (const method of REDIS_METHODS) {
      this.redis[method + 'Async'] = promisify(this.redis[method]);
    }
  }

  async init() {
    // Re-compute features using the latest model
    for (const { userId, sequences } of await this.getAllSequences()) {
      this.onSequences(userId, sequences);
    }
  }

  async shutdown() {
    this.redis.quit();
  }

  async createNonce() {
    const nonce = crypto.randomBytes(NONCE_SIZE).toString('hex');
    const key = NONCE_PREFIX + nonce;
    await this.redis.setexAsync(key, NONCE_EXPIRATION, '1');
    this.lru.set(key, true, NONCE_EXPIRATION * 1000);
    return nonce;
  }

  async checkNonce(nonce) {
    if (typeof nonce !== 'string' || nonce.length !== NONCE_SIZE * 2) {
      return false;
    }

    const key = NONCE_PREFIX + nonce;
    let present;
    if (this.lru.peek(key)) {
      this.lru.del(key);
      present = true;
    } else {
      present = await this.redis.getAsync(key);
    }

    await this.redis.delAsync(key);
    return !!present;
  }

  async getUserByToken(token) {
    let id;

    const key = USER_BY_TOKEN_PREFIX + token;
    if (this.lru.peek(key)) {
      id = this.lru.get(key);
    } else {
      id = await this.redis.getAsync(key);
      if (!id) {
        return undefined;
      }
      this.lru.set(key, id, TOKEN_EXPIRATION * 1000);
    }

    return await this.getUserById(id);
  }

  async getUserById(id) {
    const lruKey = USER_PREFIX + id;
    if (this.lru.peek(lruKey)) {
      return this.lru.get(lruKey);
    }

    // TODO(indutny): disk storage
    const json = await this.redis.hgetAsync(USER_HMAP, id);
    const user = JSON.parse(json);
    this.lru.set(lruKey, user);
    return user;
  }

  async storeUser(user) {
    const token = crypto.randomBytes(TOKEN_SIZE).toString('base64');

    await Promise.all([
      // TODO(indutny): disk storage
      this.redis.hsetAsync(USER_HMAP, user.id, JSON.stringify(user)),

      this.redis.setexAsync(USER_BY_TOKEN_PREFIX + token, TOKEN_EXPIRATION,
        user.id),
    ]);

    this.lru.set(USER_PREFIX + user.id, user);
    this.lru.set(USER_BY_TOKEN_PREFIX + token, user.id,
      TOKEN_EXPIRATION * 1000);

    return token;
  }

  async getAllUserIds() {
    // TODO(indutny): disk storage
    return await this.redis.hkeysAsync(USER_HMAP);
  }

  async getAllSequences() {
    const userIds = await this.getAllUserIds();

    const result = [];
    await Promise.all(userIds.map(async (userId) => {
      // TODO(indutny): disk storage
      const sequences = await this.redis.lrangeAsync(
        EVENTS_BY_USER_PREFIX + userId, 0, -1);

      result.push({
        userId,
        sequences: sequences.map((seq) => JSON.parse(seq)),
      });
    }));
    return result;
  }

  async storeSequence(userId, sequence) {
    const key = EVENTS_BY_USER_PREFIX + userId;
    const pastLen = await this.redis.llenAsync(key);
    if (pastLen > MAX_SEQUENCES) {
      return { sequenceCount: pastLen };
    }

    const len = await this.redis.lpushAsync(key,
      JSON.stringify(sequence));
    this.onSequences(userId, [ sequence ]);

    return { sequenceCount: len };
  }

  async search(features) {
    const matches = [];
    for (const [ userId, known ] of this.features) {
      const distance = this.model.computeDistance(features, known);
      if (distance < 1) {
        const user = await this.getUserById(userId);
        matches.push({ distance, user });
      }
    }

    matches.sort((a, b) => a.distance - b.distance);
    return matches.slice(0, MAX_RESULTS);
  };

  repairSeq(userId, seq) {
    const sentence = seq.map((event) => decompress(event.code)).join('');

    const distances = SENTENCES.map((original) => {
      return {
        original,
        distance: levenshtein.get(original, sentence),
      };
    });
    distances.sort((a, b) => a.distance - b.distance);

    const match = distances[0];
    if (match.distance === 0) {
      return seq;
    }

    const unfixedLen = seq.length;

    const out = [];
    const original = match.original.toLowerCase().replace(/[^a-z., ]+/g, '');
    for (let i = 0; i < original.length; i++) {
      const expected = compress(original[i].charCodeAt(0));
      for (let j = 0; j < seq.length; j++) {
        if (expected === seq[j].code) {
          out.push(seq[j]);
          seq.splice(j, 1);
          break;
        }
      }
    }

    if (out.length < unfixedLen * MIN_REPAIR_OUT_LEN) {
      throw new Error(`Users ${userId} seq ${sentence} is beyond repair`);
    }

    return out;
  }

  async repair() {
    const userIds = [];

    for (const { userId, sequences } of await this.getAllSequences()) {
      userIds.push(userId);
      await this.redis.delAsync(REPAIR_BY_USER_PREFIX + userId);
      for (let seq of sequences) {
        seq = this.repairSeq(userId, seq);
        await this.redis.lpushAsync(
          REPAIR_BY_USER_PREFIX + userId,
          JSON.stringify(seq));
      }
    }

    await Promise.all(userIds.map(async (userId) => {
      try {
        await this.redis.renameAsync(
          REPAIR_BY_USER_PREFIX + userId,
          EVENTS_BY_USER_PREFIX + userId)
      } catch (e) {
        console.error(e.message + ': at ' + userId);
      }
    }));
  }

  // Internal

  onSequences(userId, sequences) {
    let list = null;
    if (this.features.has(userId)) {
      list = this.features.get(userId);
    } else {
      list = [];
      this.features.set(userId, list);
    }

    for (const seq of sequences) {
      list.push(this.model.call(seq));
    }
  }
}
