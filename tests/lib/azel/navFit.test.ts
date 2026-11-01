import { describe, it, expect } from 'vitest';
import { fitItems } from '../../../app/components/layout/useNavFit';

describe('fitItems', () => {
  it('keeps every link when they all fit', () => {
    expect(fitItems([100, 100, 100], 320, 10, 80)).toBe(3);
  });

  it('moves links from the end into «المزيد», keeping room for it', () => {
    // 100 + 10 + 100 + 10 + 80 = 300 fits; a third link would not
    expect(fitItems([100, 100, 100, 100], 305, 10, 80)).toBe(2);
  });

  it('can hide everything on a very narrow bar', () => {
    expect(fitItems([100, 100], 50, 10, 80)).toBe(0);
  });
});
