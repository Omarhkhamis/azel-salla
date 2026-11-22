import { describe, it, expect, vi } from 'vitest';
import { giftLines, giftOptions, missingOption, pickedIds, placeGift } from '../../../app/lib/azel/gift';

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
  const GIFTS = [417224696, 1011424832, 1033697530, 1898207907];

  it('finds the gift lines in the cart', () => {
    const cart = { cart: { items: [{ id: 9, product_id: 1224786269 }, { id: 10, product_id: '417224696' }] } };
    expect(giftLines(cart, GIFTS)).toEqual([{ id: 10, product_id: '417224696' }]);
  });

  it('replaces a gift already in the cart instead of adding a second one', async () => {
    const calls: string[] = [];
    const cart = {
      details: vi.fn(async () => ({
        data: {
          cart: {
            items: [
              { id: 1, product_id: 1224786269 },
              { id: 2, product_id: 417224696 },
            ],
          },
        },
      })),
      deleteItem: vi.fn(async (id: unknown) => void calls.push(`delete ${id}`)),
      addItem: vi.fn(async (item: { id: number }) => void calls.push(`add ${item.id}`)),
    };
    await placeGift(cart, { id: 1033697530, options: { '1115672946': 855392916 } }, GIFTS);
    expect(calls).toEqual(['delete 2', 'add 1033697530']);
    expect(cart.addItem).toHaveBeenCalledWith({
      id: 1033697530,
      quantity: 1,
      options: { '1115672946': 855392916 },
    });
  });

  it('adds a gift without options as a plain product', async () => {
    const cart = {
      details: vi.fn(async () => ({ data: { cart: { items: [] } } })),
      deleteItem: vi.fn(),
      addItem: vi.fn(async () => undefined),
    };
    await placeGift(cart, { id: 417224696, options: {} }, GIFTS);
    expect(cart.deleteItem).not.toHaveBeenCalled();
    expect(cart.addItem).toHaveBeenCalledWith({ id: 417224696, quantity: 1 });
  });
});
