/**
 * «اختر هديتك»: a free gift picked on the product page and added to the cart as
 * its own product, so the shipping company receives its real code (GPS, CC09,
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

interface CartLineOption {
  id?: unknown;
  value?: unknown;
  details?: { id?: unknown; is_selected?: unknown }[];
}

interface CartLine {
  id?: unknown;
  product_id?: unknown;
  quantity?: unknown;
  options?: CartLineOption[];
}

export interface GiftCart {
  /** Salla's cart details, with each line's options. */
  details: () => Promise<{ data?: unknown } | undefined>;
  deleteItem: (id: unknown) => Promise<unknown>;
  updateItem: (item: { id: unknown; quantity: number }) => Promise<unknown>;
  addItem: (item: { id: number; quantity: number; options?: Record<string, number> }) => Promise<unknown>;
}

/** The gift the theme put in a cart, remembered so a new choice replaces only that one. */
export interface PlacedGift {
  cartId: string;
  id: number;
  options: Record<string, number>;
}

const PLACED_KEY = 'azel:gift';

export function readPlacedGift(): PlacedGift | null {
  try {
    const raw = window.localStorage.getItem(PLACED_KEY);
    return raw ? (JSON.parse(raw) as PlacedGift) : null;
  } catch {
    return null;
  }
}

function savePlacedGift(gift: PlacedGift) {
  try {
    window.localStorage.setItem(PLACED_KEY, JSON.stringify(gift));
  } catch {
    /* private mode: a later choice adds rather than replaces */
  }
}

function cartOf(data: unknown): { id?: unknown; items?: CartLine[] } {
  const d = data as { cart?: { id?: unknown; items?: CartLine[] }; id?: unknown; items?: CartLine[] } | undefined;
  return d?.cart ?? d ?? {};
}

/** A line's option holds this value: the picked detail, or the option's own value. */
function hasValue(line: CartLine, optionId: string, valueId: number) {
  const option = (line.options ?? []).find((o) => String(o.id) === optionId);
  if (!option) return false;
  if (String(option.value) === String(valueId)) return true;
  return (option.details ?? []).some((d) => String(d.id) === String(valueId) && !!d.is_selected);
}

/**
 * The cart line holding the gift the theme placed: same product, and the same
 * option values when the line reports its options.
 */
export function placedGiftLine(data: unknown, placed: PlacedGift): CartLine | null {
  const lines = (cartOf(data).items ?? []).filter((line) => Number(line.product_id) === placed.id);
  const optionIds = Object.keys(placed.options);
  return (
    lines.find((line) =>
      optionIds.every((id) => !line.options?.length || hasValue(line, id, placed.options[id]))
    ) ?? null
  );
}

/**
 * Puts the gift in the cart. The gift the theme placed earlier in this same cart
 * comes out first, so a new choice replaces it instead of adding a second gift.
 * Anything else stays: a product the customer bought themselves is never touched,
 * and when Salla keeps a paid one and the gift on one line, only one comes off it.
 */
export async function placeGift(cart: GiftCart, choice: GiftChoice) {
  const current = await cart.details();
  const cartId = String(cartOf(current?.data).id ?? '');
  const placed = readPlacedGift();
  if (placed && cartId && placed.cartId === cartId) {
    const line = placedGiftLine(current?.data, placed);
    const quantity = Number(line?.quantity) || 1;
    if (line?.id != null) {
      if (quantity > 1) await cart.updateItem({ id: line.id, quantity: quantity - 1 });
      else await cart.deleteItem(line.id);
    }
  }
  const options = Object.keys(choice.options).length ? { options: choice.options } : {};
  await cart.addItem({ id: choice.id, quantity: 1, ...options });
  savePlacedGift({ cartId, id: choice.id, options: choice.options });
}
