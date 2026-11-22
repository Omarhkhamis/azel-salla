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

/* ---- keeping gifts and packages in step after the cart changes ---- */

/** One gift unit the picker put in a cart. */
export interface GiftUnit {
  id: number;
  options: Record<string, number>;
}

/** The gifts the picker added to one cart, oldest first. */
export interface GiftLedger {
  cartId: string;
  units: GiftUnit[];
}

const LEDGER_KEY = 'azel:gifts';

export function readLedger(): GiftLedger | null {
  try {
    const raw = window.localStorage.getItem(LEDGER_KEY);
    const ledger = raw ? (JSON.parse(raw) as GiftLedger) : null;
    return ledger && Array.isArray(ledger.units) ? ledger : null;
  } catch {
    return null;
  }
}

export function writeLedger(ledger: GiftLedger) {
  try {
    window.localStorage.setItem(LEDGER_KEY, JSON.stringify(ledger));
  } catch {
    /* private mode: the cart is not kept in step, the add itself still works */
  }
}

/** Notes the gifts just added, so later cart changes can tell them from bought ones. */
export function recordGifts(cartId: unknown, choice: GiftChoice, quantity: number) {
  const id = String(cartId ?? '');
  if (!id) return;
  const ledger = readLedger();
  const units = ledger?.cartId === id ? [...ledger.units] : [];
  for (let i = 0; i < quantity; i++) units.push({ id: choice.id, options: { ...choice.options } });
  writeLedger({ cartId: id, units });
}

interface CartLineOption {
  id?: unknown;
  value?: unknown;
  details?: { id?: unknown; is_selected?: unknown }[];
}

export interface CartLine {
  id?: unknown;
  product_id?: unknown;
  quantity?: unknown;
  options?: CartLineOption[];
}

export function cartOf(data: unknown): { id?: unknown; items: CartLine[] } {
  const d = data as { cart?: { id?: unknown; items?: CartLine[] }; id?: unknown; items?: CartLine[] } | undefined;
  const cart = d?.cart ?? d ?? {};
  return { id: cart.id, items: cart.items ?? [] };
}

/** A line's option holds this value: the picked detail, or the option's own value. */
function hasValue(line: CartLine, optionId: string, valueId: number) {
  const option = (line.options ?? []).find((o) => String(o.id) === optionId);
  if (!option) return false;
  if (String(option.value) === String(valueId)) return true;
  return (option.details ?? []).some((d) => String(d.id) === String(valueId) && !!d.is_selected);
}

/** The cart line a gift unit sits on: same product, and the same option values when the line reports them. */
export function lineFor(items: CartLine[], unit: GiftUnit): CartLine | undefined {
  const optionIds = Object.keys(unit.options);
  return items.find(
    (line) =>
      Number(line.product_id) === unit.id &&
      optionIds.every((id) => !line.options?.length || hasValue(line, id, unit.options[id]))
  );
}

/** What has to change for the cart to hold no more gifts than packages. */
export interface GiftTrim {
  ledger: GiftLedger;
  /** New quantity for each line to change (0 removes the line), with the gift's options: Salla wants them on an update. */
  changes: { id: unknown; quantity: number; options?: Record<string, number> }[];
}

/**
 * Plans the trim, without touching the cart. Gifts the customer already removed
 * leave the ledger; then, while there are more gifts than packages, the newest
 * gift comes off its line. A product the customer bought themselves is never
 * counted, even when Salla keeps it on the same line as a gift.
 */
export function planGiftTrim(data: unknown, ledger: GiftLedger | null, packageIds: number[]): GiftTrim | null {
  const cart = cartOf(data);
  if (!ledger || !ledger.units.length || String(cart.id ?? '') !== ledger.cartId) return null;

  const left = new Map<CartLine, number>();
  cart.items.forEach((line) => left.set(line, Number(line.quantity) || 0));
  const units = ledger.units.filter((unit) => {
    const line = lineFor(cart.items, unit);
    if (!line || (left.get(line) ?? 0) < 1) return false;
    left.set(line, (left.get(line) ?? 0) - 1);
    return true;
  });

  const packages = cart.items
    .filter((line) => packageIds.includes(Number(line.product_id)))
    .reduce((sum, line) => sum + (Number(line.quantity) || 0), 0);

  const quantity = new Map<CartLine, { quantity: number; unit: GiftUnit }>();
  while (units.length > packages) {
    const unit = units.pop()!;
    const line = lineFor(cart.items, unit)!;
    const now = quantity.get(line)?.quantity ?? (Number(line.quantity) || 0);
    quantity.set(line, { quantity: now - 1, unit });
  }

  return {
    ledger: { cartId: ledger.cartId, units },
    changes: [...quantity].map(([line, { quantity: q, unit }]) => ({
      id: line.id,
      quantity: Math.max(0, q),
      ...(Object.keys(unit.options).length ? { options: unit.options } : {}),
    })),
  };
}

export interface GiftTrimCart {
  details: () => Promise<{ data?: unknown } | undefined>;
  updateItem: (item: { id: unknown; quantity: number; options?: Record<string, number> }) => Promise<unknown>;
  deleteItem: (id: unknown) => Promise<unknown>;
}

/** Takes the gifts the cart no longer has packages for back out of it. */
export async function trimGifts(cart: GiftTrimCart, packageIds: number[]): Promise<boolean> {
  const ledger = readLedger();
  if (!ledger?.units.length) return false;
  const current = await cart.details();
  const plan = planGiftTrim(current?.data, ledger, packageIds);
  if (!plan) return false;
  for (const change of plan.changes) {
    if (change.quantity > 0) {
      const { id, quantity, options } = change;
      await cart.updateItem({ id, quantity, ...(options ? { options } : {}) });
    } else await cart.deleteItem(change.id);
  }
  writeLedger(plan.ledger);
  return plan.changes.length > 0;
}
