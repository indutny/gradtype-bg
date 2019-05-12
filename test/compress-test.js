import assert from 'assert';

import { compress, decompress } from '../frontend/utils';

describe('compress', () => {
  it('should compress/decompress properly', () => {
    const expected = 'hello world, hi.';

    const actual = expected.split('').map((c) => compress(c.charCodeAt(0)))
      .map((c) => decompress(c))
      .join('');

    assert.strictEqual(actual, expected);
  });
});
