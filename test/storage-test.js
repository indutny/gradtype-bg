'use strict';

const assert = require('assert');

const Storage = require('../backend/storage');

describe('Storage', () => {
  let s;

  beforeEach(async () => {
    s = new Storage();
    await s.init();
  });

  afterEach(async () => {
    await s.shutdown();
  });

  it('should create and check nonce', async () => {
    const nonce = await s.createNonce();
    assert.ok(await s.checkNonce(nonce));
    assert.ok(!(await s.checkNonce(nonce)));
  });
});
