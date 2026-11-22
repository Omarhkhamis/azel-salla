import { beforeEach, describe, it, expect, vi } from 'vitest';
import {
  giftOptions,
  missingOption,
  pickedIds,
  placeGift,
  planGiftTrim,
  readLedger,
  recordGifts,
  trimGifts,
  writeLedger,
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

const TINT = 1224786269;
const FRAGRANCE = 1033697530;
const COLOR = '1115672946';
const WHITE = 855392916;
const BLACK = 1628906379;
const GPS = 417224696;

const fragrance = (id: number, quantity: number, value: number) => ({
  id,
  product_id: FRAGRANCE,
  quantity,
  options: [{ id: Number(COLOR), value }],
});
const cart = (items: unknown[], id = 77) => ({ cart: { id, items } });

describe('gift ledger', () => {
  beforeEach(() => window.localStorage.clear());

  it('adds to the same cart and starts over for a new one', () => {
    recordGifts(77, { id: GPS, options: {} }, 2);
    recordGifts('77', { id: FRAGRANCE, options: { [COLOR]: WHITE } }, 1);
    expect(readLedger()?.units).toHaveLength(3);

    recordGifts(78, { id: GPS, options: {} }, 1);
    expect(readLedger()).toEqual({ cartId: '78', units: [{ id: GPS, options: {} }] });
  });

  it('keeps nothing without a cart id', () => {
    recordGifts(undefined, { id: GPS, options: {} }, 1);
    expect(readLedger()).toBeNull();
  });
});

describe('planGiftTrim', () => {
  const ledger = (...units: { id: number; options?: Record<string, number> }[]) => ({
    cartId: '77',
    units: units.map((u) => ({ id: u.id, options: u.options ?? {} })),
  });

  it('changes nothing while every gift has its package', () => {
    const plan = planGiftTrim(
      cart([{ id: 1, product_id: TINT, quantity: 2 }, { id: 2, product_id: GPS, quantity: 2 }]),
      ledger({ id: GPS }, { id: GPS }),
      [TINT]
    );
    expect(plan?.changes).toEqual([]);
  });

  it('takes the newest gift off first when a package goes', () => {
    const plan = planGiftTrim(
      cart([
        { id: 1, product_id: TINT, quantity: 1 },
        { id: 2, product_id: GPS, quantity: 1 },
        fragrance(3, 1, WHITE),
      ]),
      ledger({ id: GPS }, { id: FRAGRANCE, options: { [COLOR]: WHITE } }),
      [TINT]
    );
    expect(plan?.changes).toEqual([{ id: 3, quantity: 0, options: { [COLOR]: WHITE } }]);
    expect(plan?.ledger.units).toEqual([{ id: GPS, options: {} }]);
  });

  it('never touches a gift product the customer paid for', () => {
    // two GPS on one line: one paid, one gift; the package is gone
    const plan = planGiftTrim(cart([{ id: 2, product_id: GPS, quantity: 2 }]), ledger({ id: GPS }), [TINT]);
    expect(plan?.changes).toEqual([{ id: 2, quantity: 1 }]);
  });

  it('tells the fragrance colours apart', () => {
    const plan = planGiftTrim(
      cart([{ id: 1, product_id: TINT, quantity: 1 }, fragrance(3, 1, BLACK), fragrance(4, 1, WHITE)]),
      ledger({ id: FRAGRANCE, options: { [COLOR]: BLACK } }, { id: FRAGRANCE, options: { [COLOR]: WHITE } }),
      [TINT]
    );
    expect(plan?.changes).toEqual([{ id: 4, quantity: 0, options: { [COLOR]: WHITE } }]);
  });

  it('forgets gifts the customer already removed', () => {
    const plan = planGiftTrim(
      cart([{ id: 1, product_id: TINT, quantity: 1 }]),
      ledger({ id: GPS }, { id: GPS }),
      [TINT]
    );
    expect(plan).toEqual({ ledger: { cartId: '77', units: [] }, changes: [] });
  });

  it('leaves another cart alone', () => {
    expect(planGiftTrim(cart([{ id: 2, product_id: GPS, quantity: 1 }], 99), ledger({ id: GPS }), [TINT])).toBeNull();
  });
});

describe('trimGifts', () => {
  beforeEach(() => window.localStorage.clear());

  it('applies the plan and keeps the ledger in step', async () => {
    writeLedger({ cartId: '77', units: [{ id: GPS, options: {} }, { id: GPS, options: {} }, { id: GPS, options: {} }] });
    const calls: unknown[] = [];
    const changed = await trimGifts(
      {
        details: async () => ({
          data: cart([{ id: 1, product_id: TINT, quantity: 1 }, { id: 2, product_id: GPS, quantity: 3 }]),
        }),
        updateItem: async (item) => void calls.push(['update', item]),
        deleteItem: async (id) => void calls.push(['delete', id]),
      },
      [TINT]
    );
    expect(changed).toBe(true);
    expect(calls).toEqual([['update', { id: 2, quantity: 1 }]]);
    expect(readLedger()?.units).toHaveLength(1);
  });

  it('does not read the cart when no gift was added', async () => {
    const details = vi.fn();
    expect(await trimGifts({ details, updateItem: vi.fn(), deleteItem: vi.fn() }, [TINT])).toBe(false);
    expect(details).not.toHaveBeenCalled();
  });
});
