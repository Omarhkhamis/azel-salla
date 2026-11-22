import { describe, it, expect, vi, beforeAll, afterEach } from 'vitest';
import { render, waitFor, fireEvent, act } from '@testing-library/react';
import { createRef } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { Product } from '@salla.sa/twilight-theme-engine/types';
import { AddToCartForm } from '../../../app/components/product/AddToCartForm';
import { buyNow } from '../../../app/lib/azel/buy-now';

let settings: Record<string, unknown> = {};

vi.mock('@salla.sa/twilight-theme-engine/i18n', () => ({
  useTranslation: () => ({ locale: 'ar', t: (key: string, fallback?: string) => fallback ?? key }),
}));
vi.mock('@salla.sa/twilight-theme-engine/providers', () => ({
  useTwilight: () => ({ store: { settings: {} }, theme: { settings } }),
}));
vi.mock('@salla.sa/twilight-theme-engine/hooks/useWishlist', () => ({
  useWishlist: () => ({ has: () => false, toggle: vi.fn() }),
}));
vi.mock('@salla.sa/twilight-theme-engine/hooks', () => ({ HookSlot: () => null }));
// The gift products, as the store's API sends them.
const GIFTS = [
  { id: '417224696', name: 'جهاز تتبع', image: { url: 'https://cdn/gps.jpg' }, has_options: false, is_out_of_stock: false },
  { id: '1033697530', name: 'فواحة', image: { url: 'https://cdn/cy04.jpg' }, has_options: true, is_out_of_stock: false },
  { id: '1898207907', name: 'مثبت جوال', image: { url: 'https://cdn/hms.jpg' }, has_options: false, is_out_of_stock: true },
];
const FRAGRANCE = {
  id: 1033697530,
  options: [
    {
      id: 1115672946,
      name: 'اختر اللون',
      required: true,
      details: [
        { id: 1628906379, name: 'أسود' },
        { id: 855392916, name: 'أبيض' },
      ],
    },
  ],
};
vi.mock('@salla.sa/twilight-theme-engine/api/product', () => ({
  product: {
    queries: {
      list: (params: { sourceValue?: number[] }) => ({
        queryKey: ['list', params.sourceValue],
        queryFn: async () => ({
          items: GIFTS.filter((g) => (params.sourceValue ?? []).includes(Number(g.id))),
          next: null,
        }),
      }),
      detail: (id: string) => ({
        queryKey: ['detail', id],
        queryFn: async () => (id === String(FRAGRANCE.id) ? FRAGRANCE : { id, options: [] }),
      }),
    },
  },
}));
vi.mock('@salla.sa/twilight-theme-engine/common', () => ({
  Image: ({ src }: { src: string }) => <img src={src} alt="" />,
}));
// The pickers are tested on their own (TintPickers.test.tsx).
vi.mock('../../../app/components/product/TintPickers', () => ({ TintPickers: () => null }));

// jsdom has no IntersectionObserver; report every element as visible so the
// deferred-hydration wrappers mount the real web-component hosts.
beforeAll(() => {
  class VisibleObserver {
    constructor(private cb: IntersectionObserverCallback) {}
    observe(target: Element) {
      this.cb(
        [{ isIntersecting: true, intersectionRatio: 1, target } as IntersectionObserverEntry],
        this as unknown as IntersectionObserver
      );
    }
    unobserve() {}
    disconnect() {}
    takeRecords() {
      return [];
    }
  }
  window.IntersectionObserver = VisibleObserver as unknown as typeof IntersectionObserver;
});

afterEach(() => {
  delete (window as unknown as { salla?: unknown }).salla;
  settings = {};
  buyNow.active = false;
});

const makeProduct = (overrides: Partial<Product> = {}): Product =>
  ({
    id: 266863684,
    name: 'Product',
    price: 500,
    regular_price: 500,
    sale_price: 0,
    is_on_sale: false,
    status: 'sale',
    type: 'product',
    max_quantity: 163,
    ...overrides,
  }) as Product;

function renderForm(product: Product) {
  const formRef = createRef<HTMLFormElement>();
  const addRef = createRef<HTMLElement>();
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const utils = render(
    <QueryClientProvider client={client}>
      <AddToCartForm product={product} formRef={formRef} addRef={addRef} />
    </QueryClientProvider>
  );
  return { ...utils, formRef, addRef };
}

const quantityHost = (container: HTMLElement) =>
  container.querySelector('salla-quantity-input') as HTMLElement | null;

describe('AddToCartForm quantity field', () => {
  it('puts name and max on the salla-quantity-input host as attributes', async () => {
    const { container } = renderForm(makeProduct());
    await waitFor(() => expect(quantityHost(container)).toBeTruthy());
    expect(quantityHost(container)!.getAttribute('name')).toBe('quantity');
    expect(quantityHost(container)!.getAttribute('max')).toBe('163');
  });

  it('omits max when the product has no quantity limit', async () => {
    const { container } = renderForm(makeProduct({ max_quantity: undefined }));
    await waitFor(() => expect(quantityHost(container)).toBeTruthy());
    expect(quantityHost(container)!.hasAttribute('max')).toBe(false);
  });

  it('posts a hidden quantity of 1 for hidden-quantity products', () => {
    const { container } = renderForm(makeProduct({ is_hidden_quantity: true }));
    const hidden = container.querySelector('input[type="hidden"][name="quantity"]') as HTMLInputElement;
    expect(hidden.value).toBe('1');
    expect(quantityHost(container)).toBeNull();
  });

  it('asks for the new price once every required field is filled', () => {
    const getPrice = vi.fn();
    (window as unknown as { salla: unknown }).salla = { product: { getPrice } };
    const { container } = renderForm(makeProduct({ is_hidden_quantity: true, can_add_note: true }));
    fireEvent.change(container.querySelector('textarea[name="notes"]')!, { target: { value: 'x' } });
    expect(getPrice).toHaveBeenCalledTimes(1);
    expect(getPrice.mock.calls[0][0]).toBeInstanceOf(FormData);
  });
});

describe('AddToCartForm buttons', () => {
  it('puts width, type and the loader position on the add-to-cart host', async () => {
    const { addRef } = renderForm(makeProduct());
    await waitFor(() => expect(addRef.current).toBeTruthy());
    expect(addRef.current!.getAttribute('width')).toBe('wide');
    expect(addRef.current!.getAttribute('type')).toBe('submit');
    expect(addRef.current!.getAttribute('loader-position')).toBe('end');
  });

  it('shows «اشترِ الآن» with the merchant label, and hides it when turned off', () => {
    settings = { buy_now_text: 'Buy' };
    const { container, unmount } = renderForm(makeProduct());
    expect(container.querySelector('#buy-now')?.textContent).toBe('Buy');
    unmount();
    settings = { buy_now_enabled: false };
    expect(renderForm(makeProduct()).container.querySelector('#buy-now')).toBeNull();
  });

  it('has no «اشترِ الآن» for a sold-out, booking or donation product', () => {
    for (const p of [{ is_out_of_stock: true }, { type: 'booking' }, { type: 'donating' }]) {
      const { container, unmount } = renderForm(makeProduct(p as Partial<Product>));
      expect(container.querySelector('#buy-now')).toBeNull();
      unmount();
    }
  });

  it('submits the form and goes to checkout once the item is added', async () => {
    const handlers: Record<string, (...a: unknown[]) => void> = {};
    const submit = vi.fn();
    const onSubmit = vi.fn();
    (window as unknown as { salla: unknown }).salla = {
      form: { onSubmit },
      cart: { submit },
      event: {
        on: (name: string, fn: (...a: unknown[]) => void) => (handlers[name] = fn),
        off: vi.fn(),
        once: vi.fn(),
      },
    };
    const { container } = renderForm(makeProduct({ is_hidden_quantity: true }));
    fireEvent.click(container.querySelector('#buy-now')!);
    expect(onSubmit).toHaveBeenCalledWith('cart.addItem', expect.anything());
    expect(buyNow.active).toBe(true);

    handlers['cart::item.added']();
    expect(submit).toHaveBeenCalled();
  });

  it('does not submit when a required field is empty', () => {
    const onSubmit = vi.fn();
    (window as unknown as { salla: unknown }).salla = { form: { onSubmit } };
    const { container, formRef } = renderForm(makeProduct({ is_hidden_quantity: true }));
    const required = document.createElement('input');
    required.required = true;
    required.name = 'options[1]';
    formRef.current!.append(required);
    fireEvent.click(container.querySelector('#buy-now')!);
    expect(onSubmit).not.toHaveBeenCalled();
    expect(buyNow.active).toBe(false);
  });
});

describe('AddToCartForm gift picker («اختر هديتك»)', () => {
  const TINT = 1224786269;
  const giftSettings = () => ({
    gift_for_products: [{ id: TINT }],
    gift_products: [1033697530, 417224696, 1898207907],
  });

  /** A Salla SDK stand-in that records the cart calls in order. */
  function installSdk() {
    const calls: string[] = [];
    const handlers: Record<string, (...a: unknown[]) => void> = {};
    const salla = {
      form: { onSubmit: vi.fn(() => calls.push('submit form')) },
      event: {
        on: (name: string, fn: (...a: unknown[]) => void) => (handlers[name] = fn),
        off: vi.fn(),
        once: vi.fn(),
      },
      cart: {
        addItem: vi.fn(async (item: { id: number }) => void calls.push(`add ${item.id}`)),
        deleteItem: vi.fn(async (id: unknown) => void calls.push(`delete ${id}`)),
        updateItem: vi.fn(async (item: { id: unknown }) => void calls.push(`update ${item.id}`)),
        submit: vi.fn(() => calls.push('checkout')),
      },
      api: {
        cart: {
          details: vi.fn(async () => ({
            data: {
              cart: {
                id: 77,
                items: [
                  { id: 50, product_id: TINT, quantity: 1 },
                  { id: 51, product_id: 417224696, quantity: 1 },
                ],
              },
            },
          })),
        },
      },
    };
    (window as unknown as { salla: unknown }).salla = salla;
    return { salla, calls, handlers };
  }

  it('shows nothing on a product that is not set to offer a gift', () => {
    settings = giftSettings();
    const { container } = renderForm(makeProduct({ id: 999 } as Partial<Product>));
    expect(container.querySelector('#opt-gift')).toBeNull();
  });

  it('shows the gifts in the merchant’s order, with a sold-out one disabled', async () => {
    settings = giftSettings();
    const { container } = renderForm(makeProduct({ id: TINT, is_hidden_quantity: true } as Partial<Product>));
    await waitFor(() => expect(container.querySelectorAll('.gift-card:not(.is-loading)')).toHaveLength(3));
    const cards = [...container.querySelectorAll<HTMLButtonElement>('.gift-card')];
    expect(cards.map((c) => c.querySelector('b')?.textContent)).toEqual(['فواحة', 'جهاز تتبع', 'مثبت جوال']);
    expect(cards[2].disabled).toBe(true);
    expect(container.querySelector('.ol-t')?.textContent).toContain('azel.gift.title');
  });

  it('blocks adding to cart until a gift is chosen', async () => {
    settings = giftSettings();
    const { salla } = installSdk();
    const { container } = renderForm(makeProduct({ id: TINT, is_hidden_quantity: true } as Partial<Product>));
    await waitFor(() => expect(container.querySelectorAll('.gift-card:not(.is-loading)')).toHaveLength(3));
    fireEvent.submit(container.querySelector('form')!);
    expect(salla.form.onSubmit).not.toHaveBeenCalled();
    expect(container.querySelector<HTMLElement>('#gift-err')!.hidden).toBe(false);
    expect(container.querySelector('#gift-err')!.textContent).toBe('azel.gift.error');
  });

  it('asks for the fragrance’s colour, then adds the package', async () => {
    settings = giftSettings();
    const { salla } = installSdk();
    const { container } = renderForm(makeProduct({ id: TINT, is_hidden_quantity: true } as Partial<Product>));
    await waitFor(() => expect(container.querySelectorAll('.gift-card:not(.is-loading)')).toHaveLength(3));
    fireEvent.click(container.querySelectorAll('.gift-card')[0]);
    await waitFor(() => expect(container.querySelectorAll('.gift-val')).toHaveLength(2));
    fireEvent.submit(container.querySelector('form')!);
    expect(salla.form.onSubmit).not.toHaveBeenCalled();
    expect(container.querySelector('#gift-err')!.textContent).toBe('azel.gift.option_error');

    fireEvent.click(container.querySelectorAll('.gift-val')[1]);
    expect(container.querySelector<HTMLElement>('#gift-err')!.hidden).toBe(true);
    fireEvent.submit(container.querySelector('form')!);
    expect(salla.form.onSubmit).toHaveBeenCalledTimes(1);
  });

  it('adds the gift after the package, leaving what is already in the cart', async () => {
    settings = giftSettings();
    const { salla, calls, handlers } = installSdk();
    const { container } = renderForm(makeProduct({ id: TINT, is_hidden_quantity: true } as Partial<Product>));
    await waitFor(() => expect(container.querySelectorAll('.gift-card:not(.is-loading)')).toHaveLength(3));
    fireEvent.click(container.querySelectorAll('.gift-card')[0]);
    await waitFor(() => expect(container.querySelectorAll('.gift-val')).toHaveLength(2));
    fireEvent.click(container.querySelectorAll('.gift-val')[1]);
    fireEvent.submit(container.querySelector('form')!);

    await act(async () => handlers['cart::item.added']({}, TINT));
    await waitFor(() => expect(calls).toEqual(['submit form', 'add 1033697530']));
    expect(salla.cart.addItem).toHaveBeenCalledWith({
      id: 1033697530,
      quantity: 1,
      options: { '1115672946': 855392916 },
    });

    // the gift's own add comes back through the same event, and changes nothing
    await act(async () => handlers['cart::item.added']({}, 1033697530));
    expect(salla.cart.addItem).toHaveBeenCalledTimes(1);
    expect(salla.cart.submit).not.toHaveBeenCalled();
  });

  it('goes to checkout only once the gift is in the cart («اشترِ الآن»)', async () => {
    settings = giftSettings();
    const { calls, handlers } = installSdk();
    const { container } = renderForm(makeProduct({ id: TINT, is_hidden_quantity: true } as Partial<Product>));
    await waitFor(() => expect(container.querySelectorAll('.gift-card:not(.is-loading)')).toHaveLength(3));
    fireEvent.click(container.querySelectorAll('.gift-card')[1]);
    fireEvent.click(container.querySelector('#buy-now')!);
    await act(async () => handlers['cart::item.added']({}, TINT));
    await waitFor(() => expect(calls).toEqual(['submit form', 'add 417224696', 'checkout']));
  });

  it('adds no gift when the picker is optional and none was chosen', async () => {
    settings = { ...giftSettings(), gift_required: false };
    const { salla, handlers } = installSdk();
    const { container } = renderForm(makeProduct({ id: TINT, is_hidden_quantity: true } as Partial<Product>));
    await waitFor(() => expect(container.querySelectorAll('.gift-card:not(.is-loading)')).toHaveLength(3));
    fireEvent.submit(container.querySelector('form')!);
    expect(salla.form.onSubmit).toHaveBeenCalledTimes(1);
    await act(async () => handlers['cart::item.added']({}, TINT));
    expect(salla.cart.addItem).not.toHaveBeenCalled();
  });

  it('adds one gift for every package in the add', async () => {
    settings = giftSettings();
    const { salla, handlers } = installSdk();
    const { container } = renderForm(makeProduct({ id: TINT, is_hidden_quantity: true } as Partial<Product>));
    await waitFor(() => expect(container.querySelectorAll('.gift-card:not(.is-loading)')).toHaveLength(3));
    fireEvent.click(container.querySelectorAll('.gift-card')[1]);
    container.querySelector<HTMLInputElement>('input[name="quantity"]')!.value = '2';
    fireEvent.submit(container.querySelector('form')!);
    await act(async () => handlers['cart::item.added']({}, TINT));
    await waitFor(() => expect(salla.cart.addItem).toHaveBeenCalledWith({ id: 417224696, quantity: 2 }));
  });
});
