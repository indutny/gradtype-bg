import assert from 'assert';

import { filter } from '../frontend/utils';

describe('filter', () => {
  it('should order events properly', () => {
    const seq = filter('ab', [
      { key: 'a', type: 'down', now: 100 },
      { key: 'b', type: 'down', now: 120 },
      { key: 'a', type: 'up', now: 150 },
      { key: 'b', type: 'up', now: 160 },
    ]);

    assert.deepStrictEqual(seq, [
      { code: 0, duration: 20, hold: 50 },
      { code: 1, duration: 0, hold: 40 },
    ]);
  });
});
