import { useCallback, useMemo } from 'react';
import { useTwilight } from '@salla.sa/twilight-theme-engine/providers';
import { pickedIds } from '../../lib/azel/gift';
import { gradesFromSettings } from '../../lib/azel/tint';
import { localizeDigits } from '../../lib/azel/utils';

/** Theme settings as Twig's `theme.settings.get(id, fallback)` reads them. */
export function useSettings() {
  const { theme } = useTwilight();
  const settings = theme?.settings as Record<string, unknown> | undefined;
  return useCallback(
    // `fallback` is widened: `get('x', true)` reads a boolean, not the literal `true`.
    <T = unknown,>(id: string, fallback?: T extends boolean ? boolean : T): T extends boolean ? boolean : T => {
      const value = settings?.[id];
      return (value === undefined || value === null ? fallback : value) as T extends boolean
        ? boolean
        : T;
    },
    [settings]
  );
}

export function useGrades() {
  const { theme } = useTwilight();
  const settings = theme?.settings as Record<string, unknown> | undefined;
  return useMemo(() => gradesFromSettings(settings), [settings]);
}

/** Digits in the store's numeral setting. */
export function useNum() {
  const { store } = useTwilight();
  const arabic = !!store?.settings?.arabic_numbers_enabled;
  return useCallback((value: unknown) => localizeDigits(value, arabic), [arabic]);
}

export function useHideSoldOut() {
  const get = useSettings();
  return get('hide_sold_out', true) !== false;
}

/** The products that come with a gift (`gift_for_products`), when gifts are set up at all. */
export function usePackageIds(): number[] {
  const get = useSettings();
  const forIds = pickedIds(get('gift_for_products'));
  return pickedIds(get('gift_products')).length ? forIds : [];
}

/**
 * A package that comes with a gift is added from its product page, where the
 * customer picks the gift: the cart lets its quantity go down, not up.
 */
export function usePackageLock(productId: unknown): boolean {
  return usePackageIds().includes(Number(productId));
}
