import assert from 'assert';

import Storage from '../backend/storage';

import REPAIR_SEQ from './fixtures/repair';
import REPAIR_SEQ_EXPECTED from './fixtures/repair.expected';

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

  it('should create and get user', async () => {
    const user = { id: 'test', data: 'data' };
    const token = await s.storeUser(user);
    assert.deepStrictEqual(await s.getUserByToken(token), user);
    assert.deepStrictEqual(await s.getUserById(user.id), user);
  });

  it('should store sequence and compute its features', async () => {
    const user = { id: 'test', data: 'data' };
    await s.storeUser(user);

    const featuresBefore = (s.features.get('test') || []).length;

    const info = await s.storeSequence(user.id, [
      { code: 7, hold: 0.1399998664855957, duration: 0.08099985122680664 },
      { code: 4, hold: 0.11900019645690918, duration: 0.10400009155273438 },
    ]);
    assert(info.sequenceCount > 0);

    const featuresAfter = s.features.get('test').length;
    assert.strictEqual(featuresAfter, featuresBefore + 1);
  });

  it('should repair sequence', async () => {
    const repaired = s.repairSeq('indutny', REPAIR_SEQ);

    assert.deepStrictEqual(repaired, REPAIR_SEQ_EXPECTED);
  });
});
