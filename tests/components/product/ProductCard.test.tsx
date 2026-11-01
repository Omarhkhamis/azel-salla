import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, render, waitFor } from '@testing-library/react';
import type { Product } from '@salla.sa/twilight-theme-engine/types';
import { ProductCard } from '../../../app/components/product/ProductCard';

const toggle = vi.fn();
let wished: number[] = [];
let settings: Record<string, unknown> = {};
let ratingEnabled = true;

vi.mock('@salla.sa/twilight-theme-engine/hooks/useWishlist', () => ({
  useWishlist: () => ({ has: (id: number) => wished.includes(id), toggle }),
}));
vi.mock('@salla.sa/twilight-theme-engine/hooks/useMoney', () => ({
  useMoney: () => ({ format: (n: unknown) => <span className="money">{String(n)}</span> }),
}));
vi.mock('@salla.sa/twilight-theme-engine/i18n', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
vi.mock('@salla.sa/twilight-theme-engine/providers', () => ({
  useTwilight: () => ({
    theme: { settings },
    store: { settings: { rating_enabled: ratingEnabled } },
  }),
}));
vi.mock('@salla.sa/twilight-theme-engine/common', () => ({
  Image: ({ src, alt, priority }: { src: string; alt: string; priority?: boolean }) => (
    <img src={src} alt={alt} data-priority={priority ? 'yes' : 'no'} />
  ),
  Link: ({ to, children, ...rest }: { to: string; children?: React.ReactNode }) => (
    <a href={to} {...rest}>
      {children}
    </a>
  ),
}));

const makeProduct = (overrides: Partial<Product> = {}): Product =>
  ({
    id: '42',
    name: 'Film',
    url: '/film/p42',
    image: { url: 'https://cdn/x.jpg' },
    price: 100,
    regular_price: 100,
    sale_price: null,
    is_on_sale: false,
    is_out_of_stock: false,
    has_options: false,
    type: 'product',
    category: { name: 'Cars' },
    ...overrides,
  }) as unknown as Product;

beforeEach(() => {
  toggle.mockReset();
  wished = [];
  settings = {};
  ratingEnabled = true;
  delete (window as { salla?: unknown }).salla;
});

describe('ProductCard', () => {
  it('renders the design card: category, name link and price', () => {
    const { container } = render(<ProductCard product={makeProduct()} />);
    const card = container.querySelector('article.p-card')!;
    expect(card.querySelector('.p-cat')?.textContent).toBe('Cars');
    expect(card.querySelector('.p-title a')?.getAttribute('href')).toBe('/film/p42');
    expect(card.querySelector('.price')?.textContent).toBe('100');
  });

  it('shows the sale price with the regular one struck, and a discount badge', () => {
    const { container } = render(
      <ProductCard product={makeProduct({ is_on_sale: true, sale_price: 75, regular_price: 100 } as never)} />
    );
    expect(container.querySelector('.price del')?.textContent).toBe('100');
    expect(container.querySelector('.badge')?.textContent).toBe('azel.common.discount 25%');
  });

  it('prefers the promotion title as the badge', () => {
    const { container } = render(<ProductCard product={makeProduct({ promotion_title: 'New' } as never)} />);
    expect(container.querySelector('.badge')?.textContent).toBe('New');
  });

  it('toggles the wishlist with a numeric id and shows a saved product as on', () => {
    wished = [42];
    const { container } = render(<ProductCard product={makeProduct()} />);
    const heart = container.querySelector('.wish')!;
    expect(heart.classList.contains('on')).toBe(true);
    fireEvent.click(heart);
    expect(toggle).toHaveBeenCalledWith(42);
  });

  it('adds straight to the cart from «+» and confirms with a check', async () => {
    const addItem = vi.fn(() => Promise.resolve());
    (window as { salla?: unknown }).salla = { cart: { addItem } };
    const { container } = render(<ProductCard product={makeProduct()} />);
    fireEvent.click(container.querySelector('button.add-btn')!);
    expect(addItem).toHaveBeenCalledWith({ id: 42, quantity: 1 });
    await waitFor(() => expect(container.querySelector('.add-btn.added')).toBeTruthy());
  });

  it('leads to the product page when options must be chosen first', () => {
    const { container } = render(<ProductCard product={makeProduct({ has_options: true } as never)} />);
    expect(container.querySelector('a.add-btn')?.getAttribute('href')).toBe('/film/p42');
    expect(container.querySelector('button.add-btn')).toBeNull();
  });

  it('marks a sold-out product and offers no add button', () => {
    const { container } = render(<ProductCard product={makeProduct({ is_out_of_stock: true } as never)} />);
    expect(container.querySelector('.p-card.sold-out')).toBeTruthy();
    expect(container.querySelector('.add-btn.is-out')).toBeTruthy();
  });

  it('shows the rating only when the store and the setting allow it', () => {
    const rated = makeProduct({ rating: { stars: 4.5, count: 12 } } as never);
    expect(render(<ProductCard product={rated} />).container.querySelector('.p-rating')).toBeTruthy();
    settings = { card_show_rating: false };
    expect(render(<ProductCard product={rated} />).container.querySelector('.p-rating')).toBeNull();
  });

  it('draws the photo through the CDN image, eager only for the first row', () => {
    const { container } = render(<ProductCard product={makeProduct()} imagePriority />);
    expect(container.querySelector('.p-media img')?.getAttribute('data-priority')).toBe('yes');
  });

  it('covers the image when the merchant picks cover', () => {
    settings = { card_image_fit: [{ value: 'cover' }] };
    const { container } = render(<ProductCard product={makeProduct()} />);
    expect(container.querySelector('.p-media.cover')).toBeTruthy();
  });
});
