/**
 * The product id in what follows the `p` of a "new URLs" product link:
 * `266197567-azelplus` → `266197567`. `null` when it is not a product id
 * (`/promo`, `/products-old`), so the path stays a 404.
 */
export function productIdFromKey(key: string | undefined): string | null {
  return /^(\d+)(?:-|$)/.exec(key ?? '')?.[1] ?? null;
}
