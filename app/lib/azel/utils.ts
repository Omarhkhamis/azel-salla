import type { Product } from '@salla.sa/twilight-theme-engine/types';

/** A dropdown setting arrives as a string or as `[{ value }]`. */
export function pick(raw: unknown): string | undefined {
  const first = Array.isArray(raw) ? raw[0] : raw;
  if (typeof first === 'string') return first;
  const value = (first as { value?: unknown } | null | undefined)?.value;
  return value === undefined || value === null ? undefined : String(value);
}

/** A `variable-list` link arrives as a URL string, an object or an empty array. */
export function linkUrl(raw: unknown): string {
  const first = Array.isArray(raw) ? raw[0] : raw;
  if (typeof first === 'string') return first.trim();
  const obj = first as { url?: unknown; value?: unknown } | null | undefined;
  if (typeof obj?.url === 'string') return obj.url.trim();
  if (typeof obj?.value === 'string') return obj.value.trim();
  return '';
}

/**
 * Collection items keep their sub-field ids prefixed in `twilight.json`
 * (`tiles.image`), and arrive unprefixed from the store. Read both.
 */
export function collection<T>(raw: unknown, prefix: string): T[] {
  if (!Array.isArray(raw)) return [];
  const lead = `${prefix}.`;
  return raw.map((item) => {
    const out: Record<string, unknown> = {};
    Object.entries((item ?? {}) as Record<string, unknown>).forEach(([key, value]) => {
      out[key.startsWith(lead) ? key.slice(lead.length) : key] = value;
    });
    return out as T;
  });
}

export interface LinkLine {
  label: string;
  url: string;
}

/** The "text | link" textarea settings, one link per line. */
export function parseLinks(text: unknown, fallbackUrl = '#'): LinkLine[] {
  return String(text ?? '')
    .replace(/\r/g, '')
    .split('\n')
    .map((line) => {
      const [label = '', url = ''] = line.split('|');
      return { label: label.trim(), url: url.trim() || fallbackUrl };
    })
    .filter((line) => line.label);
}

export const lines = (text: unknown): string[] =>
  String(text ?? '')
    .replace(/\r/g, '')
    .split('\n')
    .map((line) => line.trim());

/** Salla money values arrive as a number, a numeric string or `{ amount, currency }`. */
export function amount(value: unknown): number {
  if (value && typeof value === 'object') return Number((value as { amount?: unknown }).amount) || 0;
  return Number(value) || 0;
}

export const digitsOnly = (value: unknown): string =>
  String(value ?? '').replace(/[\s+\-()]/g, '');

export const noSpaces = (value: unknown): string => String(value ?? '').replace(/\s/g, '');

/** Merchant HTML as plain text: tags go, block ends become spaces, entities decode. */
export function plainText(html: unknown): string {
  return String(html ?? '')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/<\/(p|div|li|h[1-6])>|<br\s*\/?>/gi, ' ')
    .replace(/<[^>]*>/g, '')
    .replace(/&amp;/g, '&')
    .trim();
}

const ARABIC_DIGITS = '٠١٢٣٤٥٦٧٨٩';

/** The store's digit setting (`arabic_numbers_enabled`), SSR-safe unlike `salla.helpers.number`. */
export const localizeDigits = (value: unknown, arabic: boolean): string =>
  arabic
    ? String(value ?? '').replace(/\d/g, (d) => ARABIC_DIGITS[Number(d)])
    : String(value ?? '');

export const inStock = (p: Product) => p && p.is_available !== false && !p.is_out_of_stock;

/** `hide_sold_out`: lists drop sold-out products from the data, so the grid has no holes. */
export const visibleProducts = (items: Product[] | undefined, hideSoldOut: boolean): Product[] =>
  hideSoldOut ? (items ?? []).filter(inStock) : (items ?? []);

/** Only a plain #rgb / #rrggbb goes into the <style> tag; the value lands outside any escaping. */
export function hexColor(value: unknown): string | null {
  const v = String(value ?? '').trim().toLowerCase();
  return /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/.test(v) ? v : null;
}
