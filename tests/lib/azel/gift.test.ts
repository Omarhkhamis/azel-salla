import { describe, it, expect, vi } from 'vitest';
import { giftOptions, missingOption, pickedIds, placeGift } from '../../../app/lib/azel/gift';

describe('pickedIds', () => {
  it('reads a product picker in every shape it arrives in', () => {
    expect(pickedIds([417224696, '1011424832', { id: 1033697530 }, { value: '1898207907' }])).toEqual([
      417224696, 1011424832, 1033697530, 1898207907,
    ]);
    expect(pickedIds([{ id_: 5, id: 'abc' }])).toEqual([5]);
    expect(pickedIds(undefined)).toEqual([]);
    expect(pickedIds('')).toEqual([]);
    expect(pickedIds([0, -2, 'x', 7, 7])).toEqual([7]);
  });
});

const FRAGRANCE_OPTIONS = [
  {
    id: 1115672946,
    name: 'اختر اللون',
    required: true,
    details: [
      { id: 1628906379, name: 'أسود' },
      { id: 855392916, name: 'أبيض', is_out: false },
    ],
  },
];

describe('giftOptions / missingOption', () => {
  it('turns a product’s options into choices', () => {
    expect(giftOptions(FRAGRANCE_OPTIONS)).toEqual([
      {
        id: 1115672946,
        name: 'اختر اللون',
        required: true,
        values: [
          { id: 1628906379, name: 'أسود', color: undefined, isOut: false },
          { id: 855392916, name: 'أبيض', color: undefined, isOut: false },
        ],
      },
    ]);
    expect(giftOptions(undefined)).toEqual([]);
    expect(giftOptions([{ id: 1, name: 'نص', details: [] }])).toEqual([]);
  });

  it('asks for a required option until it has a value', () => {
    const options = giftOptions(FRAGRANCE_OPTIONS);
    expect(missingOption({ id: 1033697530, options: {} }, options)?.name).toBe('اختر اللون');
    expect(missingOption({ id: 1033697530, options: { '1115672946': 855392916 } }, options)).toBeNull();
    expect(missingOption({ id: 417224696, options: {} }, [])).toBeNull();
  });
});

describe('placeGift', () => {
  it('adds the gift as its own line with its options', async () => {
    const cart = { addItem: vi.fn(async () => undefined) };
    await placeGift(cart, { id: 1033697530, options: { '1115672946': 855392916 } });
    expect(cart.addItem).toHaveBeenCalledWith({
      id: 1033697530,
      quantity: 1,
      options: { '1115672946': 855392916 },
    });
  });

  it('adds one gift for every package', async () => {
    const cart = { addItem: vi.fn(async () => undefined) };
    await placeGift(cart, { id: 417224696, options: {} }, 2);
    expect(cart.addItem).toHaveBeenCalledWith({ id: 417224696, quantity: 2 });
  });

  it('never adds fewer than one', async () => {
    const cart = { addItem: vi.fn(async () => undefined) };
    await placeGift(cart, { id: 417224696, options: {} }, 0);
    expect(cart.addItem).toHaveBeenCalledWith({ id: 417224696, quantity: 1 });
  });
});
