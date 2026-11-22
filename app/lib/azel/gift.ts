/**
 * «اختر هديتك»: a free gift picked on the product page and added to the cart as
 * its own product, one per package, so the shipping company receives its real code (GPS, CC09,
 * CY04…). Its price is the store's business: a "buy X get Y" offer in Salla makes
 * it 0 while the package is in the cart.
 */

/** One picked gift: the product, and a value for each of its options (`{ optionId: valueId }`). */
export interface GiftChoice {
  id: number;
  options: Record<string, number>;
}

/** The option of a gift product the customer has to choose (the fragrance's colour). */
export interface GiftOption {
  id: number;
  name: string;
  required: boolean;
  values: { id: number; name: string; color?: string; isOut: boolean }[];
}

/** A product picker setting arrives as ids, numeric strings or `{ id | value }` objects. */
export function pickedIds(raw: unknown): number[] {
  const list = Array.isArray(raw) ? raw : raw == null || raw === '' ? [] : [raw];
  const ids = list.map((entry) => {
    const value =
      typeof entry === 'object' && entry !== null
        ? ((entry as { id_?: unknown }).id_ ??
          (entry as { id?: unknown }).id ??
          (entry as { value?: unknown }).value)
        : entry;
    return Number(value);
  });
  return [...new Set(ids.filter((id) => Number.isInteger(id) && id > 0))];
}

/** The options of a gift product that hold a choice (radio, select, colour, thumbnail). */
export function giftOptions(raw: unknown): GiftOption[] {
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((option): GiftOption[] => {
    const o = option as {
      id?: unknown;
      name?: unknown;
      required?: unknown;
      details?: { id?: unknown; name?: unknown; color?: unknown; is_out?: unknown }[];
    };
    const values = (o.details ?? [])
      .map((d) => ({
        id: Number(d.id),
        name: String(d.name ?? ''),
        color: typeof d.color === 'string' && d.color ? d.color : undefined,
        isOut: !!d.is_out,
      }))
      .filter((v) => Number.isInteger(v.id) && v.id > 0);
    if (!values.length) return [];
    return [{ id: Number(o.id), name: String(o.name ?? ''), required: o.required !== false, values }];
  });
}

/** The first required option still without a value, or `null` when the choice can be added. */
export function missingOption(choice: GiftChoice, options: GiftOption[]): GiftOption | null {
  return options.find((o) => o.required && !choice.options[String(o.id)]) ?? null;
}

export interface GiftCart {
  addItem: (item: { id: number; quantity: number; options?: Record<string, number> }) => Promise<unknown>;
}

/**
 * Puts the gift in the cart as its own line: one gift for every package just
 * added, so two packages bring two gifts (one each, as the store's offer gives).
 * Nothing already in the cart is touched.
 */
export async function placeGift(cart: GiftCart, choice: GiftChoice, packages = 1) {
  const quantity = Math.max(1, Math.floor(Number(packages)) || 1);
  const options = Object.keys(choice.options).length ? { options: choice.options } : {};
  await cart.addItem({ id: choice.id, quantity, ...options });
}
