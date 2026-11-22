import { describe, it, expect, vi } from 'vitest';
import { afterEach } from 'vitest';
import {
  giftOptions,
  missingOption,
  pickedIds,
  placeGift,
  placedGiftLine,
  readPlacedGift,
} from '../../../app/lib/azel/gift';

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
  afterEach(() => window.localStorage.clear());

  const TINT_LINE = { id: 1, product_id: 1224786269, quantity: 1 };
  /** A cart stand-in that records its calls in order. */
  function fakeCart(items: object[], cartId = 77) {
    const calls: string[] = [];
    return {
      calls,
      details: vi.fn(async () => ({ data: { cart: { id: cartId, items } } })),
      deleteItem: vi.fn(async (id: unknown) => void calls.push(`delete ${id}`)),
      updateItem: vi.fn(
        async (item: { id: unknown; quantity: number }) => void calls.push(`update ${item.id} → ${item.quantity}`)
      ),
      addItem: vi.fn(async (item: { id: number }) => void calls.push(`add ${item.id}`)),
    };
  }
  const remember = (gift: object) => window.localStorage.setItem('azel:gift', JSON.stringify(gift));

  it('adds the gift next to a paid one the customer put in the cart themselves', async () => {
    const cart = fakeCart([TINT_LINE, { id: 2, product_id: 417224696, quantity: 1 }]);
    await placeGift(cart, { id: 417224696, options: {} });
    expect(cart.calls).toEqual(['add 417224696']);
    expect(cart.addItem).toHaveBeenCalledWith({ id: 417224696, quantity: 1 });
    expect(readPlacedGift()).toEqual({ cartId: '77', id: 417224696, options: {} });
  });

  it('replaces the gift it placed in this cart', async () => {
    remember({ cartId: '77', id: 417224696, options: {} });
    const cart = fakeCart([TINT_LINE, { id: 2, product_id: 417224696, quantity: 1 }]);
    await placeGift(cart, { id: 1033697530, options: { '1115672946': 855392916 } });
    expect(cart.calls).toEqual(['delete 2', 'add 1033697530']);
    expect(cart.addItem).toHaveBeenCalledWith({
      id: 1033697530,
      quantity: 1,
      options: { '1115672946': 855392916 },
    });
  });

  it('takes only one off a line that holds a paid one and the gift', async () => {
    remember({ cartId: '77', id: 417224696, options: {} });
    const cart = fakeCart([TINT_LINE, { id: 2, product_id: 417224696, quantity: 2 }]);
    await placeGift(cart, { id: 1898207907, options: {} });
    expect(cart.calls).toEqual(['update 2 → 1', 'add 1898207907']);
  });

  it('leaves an earlier cart’s gift alone', async () => {
    remember({ cartId: '12', id: 417224696, options: {} });
    const cart = fakeCart([TINT_LINE, { id: 2, product_id: 417224696, quantity: 1 }]);
    await placeGift(cart, { id: 417224696, options: {} });
    expect(cart.calls).toEqual(['add 417224696']);
  });

  it('tells the fragrance colours apart', () => {
    const black = { id: 5, product_id: 1033697530, options: [{ id: 1115672946, details: [{ id: 1628906379, is_selected: true }] }] };
    const white = { id: 6, product_id: 1033697530, options: [{ id: 1115672946, value: 855392916 }] };
    const data = { cart: { items: [black, white] } };
    const placed = (value: number) => ({ cartId: '1', id: 1033697530, options: { '1115672946': value } });
    expect(placedGiftLine(data, placed(855392916))?.id).toBe(6);
    expect(placedGiftLine(data, placed(1628906379))?.id).toBe(5);
  });
});
