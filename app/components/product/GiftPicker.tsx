import { forwardRef, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { product as productApi } from '@salla.sa/twilight-theme-engine/api/product';
import { Image } from '@salla.sa/twilight-theme-engine/common';
import { useTranslation } from '@salla.sa/twilight-theme-engine/i18n';
import type { Product } from '@salla.sa/twilight-theme-engine/types';
import { Icon } from '../azel/Icon';
import { useSettings } from '../azel/useAzel';
import { giftOptions, pickedIds, type GiftChoice, type GiftOption } from '../../lib/azel/gift';

export interface GiftSetup {
  /** The picker shows on this product, and at least one gift can be picked. */
  active: boolean;
  required: boolean;
  title: string;
  giftIds: number[];
  gifts: Product[];
  loading: boolean;
}

/**
 * The gift setup for a product, from the theme settings: which products show the
 * picker (`gift_for_products`) and which products are the gifts (`gift_products`),
 * in the merchant's order. Names, photos and stock come from the products themselves.
 */
export function useGifts(productId: number | string): GiftSetup {
  const { t } = useTranslation();
  const get = useSettings();
  const forIds = pickedIds(get('gift_for_products'));
  const giftIds = pickedIds(get('gift_products'));
  const shows = forIds.includes(Number(productId)) && giftIds.length > 0;

  const { data, isLoading } = useQuery({
    ...productApi.queries.list({ source: 'selected', sourceValue: giftIds, perPage: giftIds.length || 1 }),
    enabled: shows,
  });
  const gifts = useMemo(() => {
    const items = data?.items ?? [];
    const order = (p: Product) => giftIds.indexOf(Number(p.id));
    return items.filter((p) => order(p) >= 0).sort((a, b) => order(a) - order(b));
    // giftIds is a fresh array each render; its content is what matters
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, giftIds.join(',')]);
  const available = gifts.some((p) => !p.is_out_of_stock);

  return {
    active: shows && (isLoading || available),
    required: get('gift_required', true) !== false,
    title: get<string>('gift_title') || t('azel.gift.title'),
    giftIds,
    gifts,
    loading: shows && isLoading,
  };
}

/** The choices of the picked gift (the fragrance's colour), loaded only for a gift that has them. */
export function useGiftOptions(gift: Product | undefined): { options: GiftOption[]; loading: boolean } {
  const id = gift ? String(gift.id) : '';
  const { data, isLoading } = useQuery({
    ...productApi.queries.detail(id),
    enabled: !!gift?.has_options,
  });
  return {
    options: gift?.has_options ? giftOptions(data?.options) : [],
    loading: !!gift?.has_options && isLoading,
  };
}

interface GiftPickerProps {
  setup: GiftSetup;
  choice: GiftChoice | null;
  options: GiftOption[];
  error: string | null;
  onChange: (choice: GiftChoice) => void;
}

/**
 * «اختر هديتك المجانية»: the gift cards under the tint grades. One gift, and a value
 * for each of its options. The form adds it to the cart after the product itself.
 */
export const GiftPicker = forwardRef<HTMLDivElement, GiftPickerProps>(function GiftPicker(
  { setup, choice, options, error, onChange },
  ref
) {
  const { t } = useTranslation();
  if (!setup.active) return null;

  const pick = (gift: Product) => {
    const id = Number(gift.id);
    if (choice?.id === id) return;
    onChange({ id, options: {} });
  };
  const pickValue = (option: GiftOption, valueId: number) => {
    if (!choice) return;
    onChange({ ...choice, options: { ...choice.options, [String(option.id)]: valueId } });
  };

  return (
    <div ref={ref} className="opt gift-picker" id="opt-gift">
      <div className="opt-label">
        <span className="ol-t">
          <Icon name="gift" className="i-sm" /> {setup.title}
          {setup.required && <i className="req"> *</i>}
        </span>
      </div>

      <div className="gift-grid" role="radiogroup" aria-label={setup.title}>
        {setup.loading
          ? setup.giftIds.map((id) => <span key={id} className="gift-card is-loading" aria-hidden="true" />)
          : setup.gifts.map((gift) => {
              const active = choice?.id === Number(gift.id);
              const out = !!gift.is_out_of_stock;
              return (
                <button
                  key={gift.id}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  className={`gift-card${active ? ' active' : ''}`}
                  disabled={out}
                  onClick={() => pick(gift)}
                >
                  <span className="gift-check" aria-hidden="true">
                    <Icon name="check" />
                  </span>
                  <span className="gift-img">
                    {gift.image?.url && (
                      <Image src={gift.image.url} alt="" srcSetWidths={[160, 240]} sizes="120px" />
                    )}
                  </span>
                  <b>{gift.name}</b>
                  {out && <small>{t('azel.common.sold_out')}</small>}
                </button>
              );
            })}
      </div>

      {options.map((option) => (
        <div className="gift-opt" key={option.id}>
          <span className="gift-opt-name">
            {option.name}
            {option.required && <i className="req"> *</i>}
          </span>
          <div className="gift-vals" role="radiogroup" aria-label={option.name}>
            {option.values.map((value) => {
              const active = choice?.options[String(option.id)] === value.id;
              return (
                <button
                  key={value.id}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  className={`gift-val${active ? ' active' : ''}`}
                  disabled={value.isOut}
                  onClick={() => pickValue(option, value.id)}
                >
                  {value.color && <span className="sw" style={{ background: value.color }} />}
                  {value.name}
                </button>
              );
            })}
          </div>
        </div>
      ))}

      <p className="zone-err" id="gift-err" role="alert" hidden={!error}>
        {error}
      </p>
    </div>
  );
});
