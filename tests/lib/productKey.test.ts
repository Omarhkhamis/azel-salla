import { describe, it, expect } from 'vitest';
import { productIdFromKey } from '../../app/lib/productKey';

describe('productIdFromKey', () => {
  it.each([
    ['266197567-azelplus', '266197567'],
    ['1224786269-nano-ceramic-azel', '1224786269'],
    ['266197567', '266197567'],
    ['romo', null],
    ['123abc', null],
    ['', null],
    [undefined, null],
  ])('%s → %s', (key, id) => {
    expect(productIdFromKey(key)).toBe(id);
  });
});
