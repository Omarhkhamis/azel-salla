import { useEffect, useRef, useState, type MouseEvent } from 'react';
import type { ProductCardProps } from '@salla.sa/twilight-theme-engine/product';
import { Link } from '@salla.sa/twilight-theme-engine/common';
import { useMoney } from '@salla.sa/twilight-theme-engine/hooks/useMoney';
import { useWishlist } from '@salla.sa/twilight-theme-engine/hooks/useWishlist';
import { useTranslation } from '@salla.sa/twilight-theme-engine/i18n';
import { useTwilight } from '@salla.sa/twilight-theme-engine/providers';
import type { Product } from '@salla.sa/twilight-theme-engine/types';
import { Icon, Stars } from '../azel/Icon';
import { useNum, useSettings } from '../azel/useAzel';
import { amount, pick } from '../../lib/azel/utils';
import { sdk } from '../../lib/azel/sdk';
import placeholderUrl from '../../assets/placeholder.png';


function Badge({ product }: { product: Product }) {
  const { t } = useTranslation();
  const num = useNum();
  if (product.promotion_title) return <span className="badge">{product.promotion_title}</span>;
  const regular = amount(product.regular_price);
  const sale = amount(product.sale_price);
  if (product.is_on_sale && regular > 0 && sale > 0 && sale < regular) {
    const discount = Math.round((1 - sale / regular) * 100);
    return (
      <span className="badge">
        {t('azel.common.discount')} {num(discount)}%
      </span>
    );
  }
  return null;
}

function Price({ product }: { product: Product }) {
  const { format } = useMoney();
  if (product.is_on_sale) {
    return (
      <>
        <del>{format(amount(product.regular_price))}</del>
        {format(amount(product.sale_price))}
      </>
    );
  }
  if (product.starting_price) return <>{format(amount(product.starting_price))}</>;
  return <>{format(amount(product.price))}</>;
}

function Rating({ product }: { product: Product }) {
  const { store } = useTwilight();
  const get = useSettings();
  const show = get('card_show_rating', true) !== false && !!store?.settings?.rating_enabled;
  if (!show) return null;
  const stars = Number(product.rating?.stars) || 0;
  const count = Number(product.rating?.count) || 0;
  if (!stars || !count) {
    return product.subtitle ? <div className="p-model">{product.subtitle}</div> : null;
  }
  return (
    <div className="p-rating">
      <Stars rating={stars} />{' '}
      <span className="num">{stars.toFixed(1).replace(/\.0$/, '')}</span> <span>({count})</span>
    </div>
  );
}

/** «+» adds straight to the cart; «←» leads to the product when options must be chosen first. */
function CardAction({ product }: { product: Product }) {
  const { t } = useTranslation();
  const [busy, setBusy] = useState(false);
  const [added, setAdded] = useState(false);
  const addedTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(addedTimer.current), []);

  if (product.is_out_of_stock) {
    const label = t('azel.common.sold_out');
    return (
      <span className="add-btn is-out" title={label} aria-label={label}>
        <Icon name="x" className="i-sm" />
      </span>
    );
  }
  if (product.has_options || product.type === 'donating' || product.type === 'booking') {
    return (
      <Link to={product.url} className="add-btn" aria-label={t('azel.common.choose_options')}>
        <Icon name="arrowL" className="i-sm i-flip" />
      </Link>
    );
  }

  const add = (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (busy) return;
    setBusy(true);
    Promise.resolve(sdk()?.cart?.addItem?.({ id: Number(product.id), quantity: 1 }))
      .then(() => {
        setAdded(true);
        addedTimer.current = setTimeout(() => setAdded(false), 1500);
      })
      .catch((error) => sdk()?.logger?.error?.('azel:: quick add', error))
      .finally(() => setBusy(false));
  };

  return (
    <button
      type="button"
      className={`add-btn${busy ? ' is-loading' : ''}${added ? ' added' : ''}`}
      aria-label={t('azel.common.add_to_cart')}
      onClick={add}
    >
      <Icon name={added ? 'check' : 'plus'} className="i-sm" />
    </button>
  );
}

/**
 * The Azel card (`.p-card`), everywhere a product is listed. Registered as the
 * engine's `product:card` in `app/router.tsx`, so it must never render the engine
 * card itself. Anatomy: badge, wishlist heart, image, category, name, rating,
 * price and the round add button.
 */
export function ProductCard({ product, className, imagePriority }: ProductCardProps) {
  const { t } = useTranslation();
  const get = useSettings();
  const wishlist = useWishlist();
  // List responses send the id as a numeric string; the wishlist holds numbers.
  const id = Number(product.id);
  const cover = pick(get('card_image_fit', 'contain')) === 'cover';
  const soldOut = product.is_out_of_stock;

  return (
    <article
      className={`p-card az${soldOut ? ' sold-out' : ''}${className ? ` ${className}` : ''}`}
      id={`product-${product.id}`}
    >
      <Badge product={product} />
      <button
        type="button"
        className={`wish${wishlist.has(id) ? ' on' : ''}`}
        aria-label={t('azel.common.wishlist')}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          wishlist.toggle(id);
        }}
      >
        <Icon name="heart" className="i-sm" />
      </button>
      <Link to={product.url} className={`p-media${cover ? ' cover' : ''}`}>
        <img
          src={product.image?.url || placeholderUrl}
          alt={product.image?.alt || product.name}
          loading={imagePriority ? 'eager' : 'lazy'}
        />
      </Link>
      <div className="p-body">
        {product.category?.name && <span className="p-cat">{product.category.name}</span>}
        <h3 className="p-title">
          <Link to={product.url}>{product.name}</Link>
        </h3>
        <Rating product={product} />
        <div className="p-foot">
          <span className="price">
            <Price product={product} />
          </span>
          <CardAction product={product} />
        </div>
      </div>
    </article>
  );
}
