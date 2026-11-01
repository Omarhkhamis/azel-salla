import { describe, it, expect, vi, beforeAll, afterEach } from 'vitest';
import { render, waitFor, fireEvent } from '@testing-library/react';
import { createRef } from 'react';
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
  const utils = render(<AddToCartForm product={product} formRef={formRef} addRef={addRef} />);
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
