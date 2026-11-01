import { useEffect, useMemo, useRef, useState, type RefObject } from 'react';
import { useQuery } from '@tanstack/react-query';
import { SallaComments } from '@salla.sa/twilight-components-react/comments';
import { SallaConditionalOffer } from '@salla.sa/twilight-components-react/conditional-offer';
import { SallaInstallment } from '@salla.sa/twilight-components-react/installment';
import { SallaMetadata } from '@salla.sa/twilight-components-react/metadata';
import { SallaOffer } from '@salla.sa/twilight-components-react/offer';
import { SallaQuickOrder } from '@salla.sa/twilight-components-react/quick-order';
import { product as productApi } from '@salla.sa/twilight-theme-engine/api/product';
import { Breadcrumb, Image } from '@salla.sa/twilight-theme-engine/common';
import { HookSlot } from '@salla.sa/twilight-theme-engine/hooks';
import { useComments } from '@salla.sa/twilight-theme-engine/hooks/useComments';
import { useMoney } from '@salla.sa/twilight-theme-engine/hooks/useMoney';
import { useProduct } from '@salla.sa/twilight-theme-engine/hooks/useProduct';
import { useTranslation } from '@salla.sa/twilight-theme-engine/i18n';
import { PageBlocks } from '@salla.sa/twilight-theme-engine/home';
import { useTwilight } from '@salla.sa/twilight-theme-engine/providers';
import type { ProductPageProps } from '@salla.sa/twilight-theme-engine/routes/product';
import type { Product } from '@salla.sa/twilight-theme-engine/types';
import { stripUnsafeHtml } from '@salla.sa/twilight-theme-engine/utils';
import { BlockHookSlot } from '../common';
import { AzLink } from '../azel/AzLink';
import { Icon, Stars } from '../azel/Icon';
import { useHideSoldOut, useNum, useSettings } from '../azel/useAzel';
import { AddToCartForm, submitProductForm } from './AddToCartForm';
import { ProductCard } from './ProductCard';
import placeholderUrl from '../../assets/placeholder.png';
import tabbyUrl from '../../assets/pay/tabby_installment.png';
import tamaraUrl from '../../assets/pay/tamara_installment.png';
import { amount, lines, pick, plainText, visibleProducts } from '../../lib/azel/utils';

/** Salla's CDN sizes the photos to the gallery instead of sending the originals. */
const PHOTO_WIDTHS = [480, 720, 960, 1280] as const;
const THUMB_WIDTHS = [120, 200] as const;

/** Thumbnails swap the main photo; an option whose value carries an image shows it. */
function Gallery({
  product,
  formRef,
}: {
  product: Product;
  formRef: RefObject<HTMLFormElement | null>;
}) {
  const { t } = useTranslation();
  const get = useSettings();
  // videos have no thumbnail of their own here; the gallery shows photos
  const all = product.images ?? [];
  const images = useMemo(() => all.filter((image) => (image.type ?? 'image') === 'image'), [all]);
  const [activeUrl, setActiveUrl] = useState<string | null>(null);
  const mainUrl = activeUrl ?? product.image?.url ?? placeholderUrl;
  const cover = pick(get('product_image_fit', 'contain')) === 'cover';

  useEffect(() => {
    const form = formRef.current;
    if (!form) return;
    const onChange = (e: Event) => {
      const input = (e.target as Element).closest?.<HTMLInputElement>(
        'salla-product-options input[data-img-id]'
      );
      if (!input?.checked) return;
      const image = images.find((img) => String(img.id) === input.dataset.imgId);
      if (image?.url) setActiveUrl(image.url);
    };
    form.addEventListener('change', onChange);
    return () => form.removeEventListener('change', onChange);
  }, [formRef, images]);

  return (
    <div className={`gallery${all.length < 2 ? ' single' : ''}`}>
      {all.length > 1 && (
        <div className="thumbs" id="thumbs">
          {images.map((image, i) => (
            <button
              key={image.id ?? image.url}
              type="button"
              className={(activeUrl ?? images[0]?.url) === image.url ? 'active' : undefined}
              aria-label={`${t('azel.common.image')} ${i + 1}`}
              onClick={() => setActiveUrl(image.url ?? null)}
            >
              <Image src={image.url} alt="" srcSetWidths={THUMB_WIDTHS} sizes="88px" />
            </button>
          ))}
        </div>
      )}
      <div className={`main-img${cover ? '' : ' contain'}`} id="main-img">
        {product.promotion_title && <span className="badge">{product.promotion_title}</span>}
        <Image
          src={mainUrl}
          alt={product.image?.alt || product.name}
          id="main-photo"
          objectFit={cover ? 'cover' : 'contain'}
          priority
          srcSetWidths={PHOTO_WIDTHS}
          sizes="(max-width: 960px) 100vw, 640px"
        />
      </div>
    </div>
  );
}

/** Regular + sale price and the «وفّر» tag, live with the chosen options. */
function PriceBlock({ product }: { product: Product }) {
  const { t } = useTranslation();
  const { format } = useMoney();
  const regular = amount(product.regular_price);
  const sale = amount(product.sale_price);
  const onSale = !!product.is_on_sale && regular > 0 && sale > 0 && sale < regular;
  const shown = product.is_on_sale
    ? product.sale_price
    : (product.starting_price ?? product.price);
  return (
    <div className="pdp-price">
      <span className="price price-wrapper">
        {product.is_on_sale && (
          <del className="before-price price_is_on_sale">{format(regular)}</del>
        )}
        <span className="total-price">{format(amount(shown))}</span>
      </span>
      {onSale && (
        <span className="save-tag">
          {t('azel.product.save')} {format(regular - sale)}
        </span>
      )}
    </div>
  );
}

function Bnpl({ product }: { product: Product }) {
  const { t } = useTranslation();
  const { format } = useMoney();
  const get = useSettings();
  if (get('bnpl_enabled', true) === false) return null;
  const price = amount(product.is_on_sale ? product.sale_price : product.price);
  if (price <= 0) return null;
  const [before, after = ''] = t('azel.product.bnpl').split(':amount');
  return (
    <div className="bnpl">
      <span className="bnpl-logos">
        <span className="pay-ico">
          <img src={tabbyUrl} alt="تابي" loading="lazy" />
        </span>
        <span className="pay-ico">
          <img src={tamaraUrl} alt="تمارا" loading="lazy" />
        </span>
      </span>
      <span>
        {before}
        <b>{format(price / 4)}</b>
        {after}
      </span>
    </div>
  );
}

function Perks() {
  const get = useSettings();
  const perks = [
    { icon: 'shield', title: get<string>('perk1_title', ''), text: get<string>('perk1_text', '') },
    { icon: 'truck', title: get<string>('perk2_title', ''), text: get<string>('perk2_text', '') },
    { icon: 'refresh', title: get<string>('perk3_title', ''), text: get<string>('perk3_text', '') },
  ].filter((perk) => perk.title);
  if (!perks.length) return null;
  return (
    <div className="perks">
      {perks.map((perk) => (
        <div className="perk" key={perk.icon}>
          <Icon name={perk.icon} />
          <div>
            <b>{perk.title}</b>
            {perk.text}
          </div>
        </div>
      ))}
    </div>
  );
}

type TabId = 't-desc' | 't-specs' | 't-reviews' | 't-ship';

function ProductTabs({
  product,
  tab,
  setTab,
  tabsRef,
}: {
  product: Product;
  tab: TabId;
  setTab: (tab: TabId) => void;
  tabsRef: RefObject<HTMLDivElement | null>;
}) {
  const { t } = useTranslation();
  const { store } = useTwilight();
  const { commentsKey } = useComments();
  const get = useSettings();
  const metaRef = useRef<HTMLDivElement>(null);
  const [hasSpecs, setHasSpecs] = useState(false);
  const blockScope = useMemo(() => ({ product_id: product.id }), [product.id]);

  const shipText = String(get('shipping_text', '') ?? '').trim();
  const returnsText = String(get('returns_text', '') ?? '').trim();
  const rating = store?.settings?.rating as { show_on_product?: boolean } | undefined;
  const showReviews = rating?.show_on_product ?? !!store?.settings?.rating_enabled;
  const showShip = !!(shipText || returnsText);

  // «المواصفات» is Salla's custom fields: the tab shows only when they render.
  useEffect(() => {
    const el = metaRef.current;
    if (!el) return;
    const check = () => setHasSpecs(!!el.textContent?.trim());
    const observer = new MutationObserver(check);
    observer.observe(el, { childList: true, subtree: true, characterData: true });
    check();
    return () => observer.disconnect();
  }, []);

  const button = (id: TabId, label: string, extra?: { id?: string; hidden?: boolean }) => (
    <button
      type="button"
      className={tab === id ? 'active' : undefined}
      role="tab"
      aria-selected={tab === id}
      onClick={() => setTab(id)}
      {...extra}
    >
      {label}
    </button>
  );
  const panel = (id: TabId) => `tab-panel${tab === id ? ' active' : ''}`;

  return (
    <section className="section az pdp-tabs-sec">
      <div className="container">
        <div ref={tabsRef} className="tabs az-tabs" role="tablist">
          {button('t-desc', t('azel.product.tab_description'))}
          {button('t-specs', t('azel.product.tab_specs'), { id: 'tab-specs-btn', hidden: !hasSpecs })}
          {showReviews && button('t-reviews', t('azel.product.tab_reviews'), { id: 'reviews' })}
          {showShip &&
            button('t-ship', get<string>('shipping_title') || t('azel.product.tab_shipping'))}
        </div>
        <div className={panel('t-desc')} id="t-desc" role="tabpanel">
          <HookSlot name="product:single.description" context={{ product }} />
          {product.description && (
            <div
              className="prose"
              dangerouslySetInnerHTML={{ __html: stripUnsafeHtml(product.description) }}
            />
          )}
        </div>
        <div className={panel('t-specs')} id="t-specs" role="tabpanel" ref={metaRef}>
          {/* It throws on a product without custom fields, so it mounts only when there are some. */}
          {product.has_metadata !== false && <SallaMetadata />}
        </div>
        {showReviews && (
          <div className={panel('t-reviews')} id="t-reviews" role="tabpanel">
            <BlockHookSlot
              name="product.single.before_customer_reviews"
              wrapper="s-before-reviews"
              scope={blockScope}
            />
            <SallaComments key={commentsKey} itemId={product.id} type={'product' as never} />
          </div>
        )}
        {showShip && (
          <div className={panel('t-ship')} id="t-ship" role="tabpanel">
            <div className="prose">
              {shipText && (
                <>
                  <h3 className="ship-h">{t('azel.product.shipping')}</h3>
                  <ul>
                    {lines(shipText)
                      .filter(Boolean)
                      .map((line) => (
                        <li key={line}>{line}</li>
                      ))}
                  </ul>
                </>
              )}
              {returnsText && (
                <>
                  <h3>{t('azel.product.returns')}</h3>
                  <p style={{ whiteSpace: 'pre-line' }}>{returnsText}</p>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

function RelatedProducts({ productId }: { productId: number | string }) {
  const { t } = useTranslation();
  const get = useSettings();
  const hideSoldOut = useHideSoldOut();
  const { data } = useQuery(
    productApi.queries.list({ source: 'related', sourceValue: Number(productId), perPage: 4 })
  );
  const items = visibleProducts(data?.items, hideSoldOut).slice(0, 4);
  if (!items.length) return null;
  const eyebrow = get<string>('related_eyebrow');
  return (
    <section className="section bg-white-az az">
      <div className="container">
        <div className="section-head">
          <div>
            {eyebrow && <span className="eyebrow">{eyebrow}</span>}
            <h2 className="section-title">{get<string>('related_title') || t('azel.product.related')}</h2>
          </div>
        </div>
        <div className="products">
          {items.map((item, i) => (
            <ProductCard key={item.id} product={item} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}

/** Shows once the add-to-cart button has scrolled off; adds through the same form. */
function StickyBuy({
  product,
  formRef,
  addRef,
}: {
  product: Product;
  formRef: RefObject<HTMLFormElement | null>;
  addRef: RefObject<HTMLElement | null>;
}) {
  const { t } = useTranslation();
  const { format } = useMoney();
  const [show, setShow] = useState(false);
  useEffect(() => {
    const update = () => {
      const add = addRef.current;
      setShow(!!add && add.getBoundingClientRect().bottom < 0);
    };
    window.addEventListener('scroll', update, { passive: true });
    update();
    return () => window.removeEventListener('scroll', update);
  }, [addRef]);
  if (product.is_out_of_stock) return null;
  return (
    <div className={`sticky-buy az${show ? ' show' : ''}`} id="sticky-buy">
      <span className="price total-price">
        {format(amount(product.is_on_sale ? product.sale_price : product.price))}
      </span>
      <button type="button" className="btn" id="sb-add" onClick={() => submitProductForm(formRef.current)}>
        <Icon name="bag" className="i-sm" /> {product.add_to_cart_label || t('azel.product.add_to_cart')}
      </button>
    </div>
  );
}

/**
 * The Azel product page (design: Azel+/product.html), wired in from
 * `app/routes/$slug.p$id.tsx` with the engine's loader, head and skeleton.
 * No merchant block is required here: the editable content is theme settings.
 */
export function ProductPage({ product: initialProduct, page }: ProductPageProps) {
  const { t } = useTranslation();
  const num = useNum();
  const { store } = useTwilight();
  const get = useSettings();
  const { product } = useProduct(initialProduct);
  const formRef = useRef<HTMLFormElement>(null);
  const addRef = useRef<HTMLElement>(null);
  const tabsRef = useRef<HTMLDivElement>(null);
  const [tab, setTab] = useState<TabId>('t-desc');
  const blockScope = useMemo(() => ({ product_id: product.id }), [product.id]);

  // The Twig storefront bootstraps `salla.config` with `user.can_comment`; the React
  // SDK init doesn't, so `<salla-comment-form>` stays empty even for eligible buyers.
  // The engine exposes the same flag; copy it across before the comments mount.
  useEffect(() => {
    const salla = window.salla;
    if (!salla?.config?.set) return;
    if (salla.config.get('user.can_comment') != null) return;
    const canComment = salla.config.get('store.settings.product.user_can_comment');
    if (typeof canComment !== 'boolean') return;
    salla.config.set('user', { ...(salla.config.get('user') || {}), can_comment: canComment });
  }, []);

  const plain = plainText(initialProduct.description);
  const short = initialProduct.subtitle || plain.slice(0, 180);
  const chip = product.category?.name
    ? { name: product.category.name, url: product.category.url }
    : product.brand?.name
      ? { name: product.brand.name, url: product.brand.url }
      : null;
  const ratingCount = Number(product.rating?.count) || 0;
  const showRating = !!store?.settings?.rating_enabled && ratingCount > 0;
  // Salla sends the count only when the merchant turns on "number of sales" in
  // the store's product settings; the theme setting hides it from the page.
  const soldCount =
    get('show_sold_count', true) !== false ? Number(initialProduct.sold_quantity) || 0 : 0;

  const openReviews = () => {
    setTab('t-reviews');
    tabsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <>
      <div className="container crumbs-bar az">
        {get('product_show_breadcrumbs', true) !== false && <Breadcrumb page={page} className="crumbs" />}
      </div>

      <div className="container">
        <BlockHookSlot
          name="product.single.before_product_info"
          wrapper="s-before-product-info"
          className="!mt-0"
          scope={blockScope}
        />
      </div>

      <HookSlot name="product:start" />

      <section className="container pdp az" id={`product-${product.id}`}>
        <Gallery product={initialProduct} formRef={formRef} />

        <div className="pdp-info">
          {chip && (
            <AzLink className="chip" href={chip.url}>
              {chip.name}
            </AzLink>
          )}
          <h1>{product.name}</h1>

          <div className="pdp-meta">
            {showRating && (
              <>
                <span className="pm-rate">
                  <Stars rating={product.rating?.stars} />
                  <b className="num">{Number(product.rating?.stars ?? 0).toFixed(1)}</b>{' '}
                  <a
                    href="#reviews"
                    className="muted"
                    onClick={(e) => {
                      e.preventDefault();
                      openReviews();
                    }}
                  >
                    ({ratingCount} {t('azel.product.reviews_count')})
                  </a>
                </span>
                <span className="sep" />
              </>
            )}
            {product.is_out_of_stock ? (
              <span className="stock is-out">{t('azel.common.sold_out')}</span>
            ) : (
              <span className="stock">{t('azel.product.in_stock')}</span>
            )}
            {soldCount > 0 && (
              <>
                <span className="sep" />
                <span className="pm-sold">
                  <Icon name="bag" className="i-xs" />
                  {t('azel.product.sold').replace(':n', num(soldCount))}
                </span>
              </>
            )}
            {product.sku && (
              <>
                <span className="sep" />
                <span>
                  {t('azel.product.sku')}: <span className="ltr product-sku">{product.sku}</span>
                </span>
              </>
            )}
          </div>

          {short && (
            <p className="muted pdp-short">
              {short}
              {!initialProduct.subtitle && plain.length > 180 ? '…' : ''}
            </p>
          )}

          <PriceBlock product={product} />
          <Bnpl product={product} />

          <SallaConditionalOffer />

          <HookSlot name="product:single.description.start" context={{ product }} />

          <AddToCartForm product={product} formRef={formRef} addRef={addRef} />

          {get('show_installment', false) && <SallaInstallment price={String(product.price)} />}

          <Perks />

          <SallaQuickOrder className="quick-order" />

          <HookSlot name="product:single.description.end" context={{ product }} />
          <PageBlocks hook="product:single.description.end" scope={blockScope} />
        </div>
      </section>

      <ProductTabs product={initialProduct} tab={tab} setTab={setTab} tabsRef={tabsRef} />

      <div className="container">
        <BlockHookSlot
          name="product.single.before_product_recommendations"
          wrapper="s-before-related"
          scope={blockScope}
        />
      </div>

      {get('show_related', true) !== false && (
        <>
          <HookSlot name="product:related.start" />
          <RelatedProducts productId={product.id} />
          <HookSlot name="product:related.end" />
        </>
      )}

      <div className="container">
        <BlockHookSlot
          name="product.single.after_product_recommendations"
          wrapper="s-after-related"
          scope={blockScope}
        />
      </div>

      <StickyBuy product={product} formRef={formRef} addRef={addRef} />

      <SallaOffer />

      <HookSlot name="product:end" />
    </>
  );
}
