import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';
import { SallaAddProductButton } from '@salla.sa/twilight-components-react/add-product-button';
import { SallaButton } from '@salla.sa/twilight-components-react/button';
import { SallaCountDown } from '@salla.sa/twilight-components-react/count-down';
import { SallaFileUpload } from '@salla.sa/twilight-components-react/file-upload';
import { SallaGifting } from '@salla.sa/twilight-components-react/gifting';
import { SallaMultipleBundleProduct } from '@salla.sa/twilight-components-react/multiple-bundle-product';
// The eager Core export: product options are an essential form control, and the
// deferred wrapper's visibility-triggered hydration can stick on its skeleton.
import { SallaProductOptionsCore as SallaProductOptions } from '@salla.sa/twilight-components-react/product-options';
import { SallaProductSizeGuide } from '@salla.sa/twilight-components-react/product-size-guide';
import { SallaQuantityInput } from '@salla.sa/twilight-components-react/quantity-input';
import { useWishlist } from '@salla.sa/twilight-theme-engine/hooks/useWishlist';
import { useTranslation } from '@salla.sa/twilight-theme-engine/i18n';
import { HookSlot } from '@salla.sa/twilight-theme-engine/hooks';
import { hapticImpact } from '@salla.sa/twilight-theme-engine/native-app';
import type { Product } from '@salla.sa/twilight-theme-engine/types';
import { Icon } from '../azel/Icon';
import { useSettings } from '../azel/useAzel';
import { TintPickers } from './TintPickers';
import { buyNow } from '../../lib/azel/buy-now';
import { sdk, whenSdkReady } from '../../lib/azel/sdk';

/** The web component's `type="submit"` path skips its own loader, so drive the
    inner `<salla-button>` spinner by hand. */
type LoadableButton = HTMLElement & { load?: () => void; stop?: () => void };
const addButton = (form: HTMLFormElement | null): LoadableButton | null =>
  (form?.querySelector('salla-button') as LoadableButton | null) ?? null;

type ProductOptionsElement = HTMLElement & { validateAndScroll?: () => Promise<boolean> };

const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
  e.preventDefault();
  hapticImpact('medium');
  const btn = addButton(e.currentTarget);
  btn?.load?.();
  // Safety net: the cart events clear it on a real response; this covers a
  // silent validation bail (`salla.form.onSubmit` returns `false` either way).
  window.setTimeout(() => btn?.stop?.(), 8000);
  window.salla?.form.onSubmit('cart.addItem', e);
};

const handleChange = (e: React.FormEvent<HTMLFormElement>) => {
  const form = e.currentTarget;
  // Not reportValidity(): it focuses and scrolls to the first empty required option mid-edit.
  const isComplete = Array.from(form.elements).every(
    (el) => !(el as HTMLInputElement).willValidate || (el as HTMLInputElement).validity.valid
  );
  if (isComplete) {
    window.salla?.product?.getPrice(new FormData(form));
    return;
  }
  // A new quantity can't be priced yet: show the empty options, like the add-to-cart button.
  if ((e.target as Element).closest?.('salla-quantity-input')) {
    void form.querySelector<ProductOptionsElement>('salla-product-options')?.validateAndScroll?.();
  }
};

/** Weight line + a link that opens the size-guide modal. */
function WeightAndSizeGuide({ product }: { product: Product }) {
  const { t } = useTranslation();
  if (!product.weight && !product.has_size_guide) return null;
  return (
    <section className="bg-white p-5 rounded-md mb-5">
      {product.weight && (
        <div className={`center-between ${product.has_size_guide ? 'pb-5 mb-5 border-b-[1px]' : ''}`}>
          <b className="form-label rtl:space-x-reverse space-x-1">
            <i className="sicon-luggage-cart"></i>
            <span>{t('pages.products.weight')}</span>
          </b>
          <span className="product-weight text-sm">{product.weight}</span>
        </div>
      )}
      {product.has_size_guide && (
        <>
          <div className="center-between">
            <b className="form-label rtl:space-x-reverse space-x-1">
              <i className="sicon-pencil-ruler"></i>
              <span>{t('pages.products.size_guides')}</span>
            </b>
            <SallaButton
              shape="link"
              color="primary"
              className="!p-0 text-sm with-arrow"
              onClick={() => window.salla?.event?.dispatch('size-guide::open', String(product.id))}
            >
              {t('pages.products.show_size_guides')}
              <i className="sicon-keyboard_arrow_left"></i>
            </SallaButton>
          </div>
          <SallaProductSizeGuide />
        </>
      )}
    </section>
  );
}

/** The note / file-upload tabs and their collapse panels. */
function Attachments({ product }: { product: Product }) {
  const { t } = useTranslation();
  const [active, setActive] = useState<string | null>(null);
  if (!product.can_add_note && !product.can_upload_file) return null;
  const toggle = (id: string) => setActive((current) => (current === id ? null : id));
  const state = (id: string) => (active === id ? 'is-opened' : 'is-closed');
  return (
    <section className="bg-white p-5 rounded-md mb-5">
      <div className="sm:grid sm:grid-cols-3 sm:gap-4 sm:items-start">
        <div className="form-label">
          <b className="block">{t('pages.products.attachments')}</b>
        </div>
        <div className="mt-1 sm:mt-0 sm:col-span-2 text-end">
          <div className="flex rtl:space-x-reverse space-x-3">
            {product.can_add_note && (
              <button type="button" onClick={() => toggle('note')} className={`btn-tab btn--collapse ${state('note')}`}>
                <i className="font-medium sicon-chat-conversation-alt rtl:ml-1.5 ltr:mr-1.5"></i>
                <span className="fix-align">{t('pages.products.add_note')}</span>
              </button>
            )}
            {product.can_upload_file && (
              <button type="button" onClick={() => toggle('file')} className={`btn-tab btn--collapse ${state('file')}`}>
                <i className="font-medium sicon-paperclip rtl:ml-1.5 ltr:mr-1.5"></i>
                <span className="fix-align">{t('pages.products.add_file')}</span>
              </button>
            )}
          </div>
          {product.can_add_note && (
            <div className={`collapse-content ${state('note')}`}>
              <div className="pt-4">
                <textarea
                  className="animated animatedfadeInDown fadeInDown form-input h-16 bg-gray-50 block"
                  placeholder={t('pages.products.notes_placeholder')}
                  name="notes"
                  cols={30}
                  rows={10}
                  defaultValue={product.notes}
                ></textarea>
              </div>
            </div>
          )}
          {product.can_upload_file && (
            <div className={`collapse-content ${state('file')}`}>
              <div className="pt-4 px-1">
                <SallaFileUpload
                  accept="image/png, image/jpeg, image/jpg, image/gif, video/*, application/pdf"
                  className="product-option-uploader"
                >
                  <div className="product-option-uploader-placholder">
                    <span className="product-option-uploader-placholder-icon">
                      <i className="sicon-camera"></i>
                    </span>
                    <p className="profile-filepond-placholder-text">{t('common.uploader.drag_and_drop')}</p>
                    <span className="filepond--label-action">{t('common.uploader.browse')}</span>
                  </div>
                </SallaFileUpload>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

/** A booking / hidden-quantity product always orders exactly one. */
function QuantityField({ product }: { product: Product }) {
  const { t } = useTranslation();
  const max = product.max_quantity;
  // The loaded salla-quantity-input reads `name`/`max` from attributes; the wrapper sets properties.
  const quantityRef = useCallback(
    (el: HTMLElement | null) => {
      if (!el) return;
      el.setAttribute('name', 'quantity');
      if (max) el.setAttribute('max', String(max));
      else el.removeAttribute('max');
    },
    [max]
  );
  if (product.is_hidden_quantity || product.type === 'booking') {
    return <input type="hidden" value="1" name="quantity" aria-label={t('azel.common.quantity')} />;
  }
  return (
    <div className="qty">
      <SallaQuantityInput
        ref={quantityRef}
        max={product.max_quantity ?? undefined}
        value={1}
        name="quantity"
        aria-label={t('azel.common.quantity')}
      />
    </div>
  );
}

export interface AddToCartFormProps {
  product: Product;
  formRef: RefObject<HTMLFormElement | null>;
  /** The add-to-cart button, watched by the sticky buy bar. */
  addRef: RefObject<HTMLElement | null>;
}

/** Submits the form as «أضف للسلة» does, with the browser's validation first. */
export function submitProductForm(form: HTMLFormElement | null): boolean {
  if (!form || !form.reportValidity()) return false;
  form.requestSubmit();
  return true;
}

/**
 * The product form. Salla's own components stay inside it: options, quantity and
 * the add button own validation, variant pricing and stock.
 */
export function AddToCartForm({ product, formRef, addRef }: AddToCartFormProps) {
  const { t } = useTranslation();
  const get = useSettings();
  const wishlist = useWishlist();
  const id = Number(product.id);
  const [buying, setBuying] = useState(false);
  const releaseTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const release = useCallback(() => {
    clearTimeout(releaseTimer.current);
    buyNow.active = false;
    setBuying(false);
  }, []);

  // Stop the spinner once the cart answers. «اشترِ الآن» then goes straight to
  // checkout instead of the drawer.
  useEffect(() => {
    const dispose = whenSdkReady(() => {
      const event = sdk()?.event;
      const stop = () => addButton(formRef.current)?.stop?.();
      const onAdded = () => {
        stop();
        if (!buyNow.active) return;
        event?.once?.('cart::submit.failed', release);
        sdk()?.cart?.submit?.();
      };
      const onFailed = () => {
        stop();
        release();
      };
      event?.on?.('cart::item.added', onAdded);
      event?.on?.('cart::item.added.failed', onFailed);
      return () => {
        event?.off?.('cart::item.added', onAdded);
        event?.off?.('cart::item.added.failed', onFailed);
      };
    });
    return () => {
      dispose();
      release();
    };
  }, [formRef, release]);

  // stable ref: an inline arrow re-runs on every render and resets the user's selection
  const optionsRef = useCallback(
    (el: { setOptionsData?: (data: never[]) => void } | null) =>
      void el?.setOptionsData?.(product.options as never[]),
    [product.options]
  );

  // salla-product-options reads its `options` prop only in its constructor, and on
  // first load that runs before sdk.init has set page.id. Seed it and wait for the
  // SDK before mounting the element, so its fallback resolves on first load too.
  const [optionsReady, setOptionsReady] = useState(false);
  useEffect(() => {
    const salla = window.salla;
    if (!salla) return;
    let alive = true;
    salla.config?.set?.('page.id', product.id);
    Promise.resolve(salla.onReady?.()).finally(() => {
      if (alive) setOptionsReady(true);
    });
    return () => {
      alive = false;
    };
  }, [product.id]);

  // The loaded component copies host attributes (not properties) onto its inner salla-button.
  const addButtonRef = useCallback(
    (el: HTMLElement | null) => {
      addRef.current = el;
      if (!el) return;
      el.setAttribute('width', 'wide');
      el.setAttribute('type', 'submit');
      el.setAttribute('loader-position', 'end');
    },
    [addRef]
  );

  const onBuyNow = () => {
    if (buyNow.active) return;
    buyNow.active = true;
    setBuying(true);
    if (!submitProductForm(formRef.current)) {
      release();
      return;
    }
    releaseTimer.current = setTimeout(release, 15000);
  };

  const hasPreorder = Boolean(product.has_preorder_campaign && product.preorder);
  const showBuyNow =
    get('buy_now_enabled', true) !== false &&
    !product.is_out_of_stock &&
    product.type !== 'booking' &&
    product.type !== 'donating';
  const notify = product.notify_availability;
  const baseAmount =
    typeof product.base_currency_price === 'object'
      ? product.base_currency_price.amount
      : product.base_currency_price;
  const addLabel = product.add_to_cart_label || t('azel.product.add_to_cart');

  return (
    <form
      ref={formRef}
      className="product-form"
      encType="multipart/form-data"
      method="post"
      onSubmit={handleSubmit}
      onChange={handleChange}
    >
      <input type="hidden" name="id" value={product.id} />

      <HookSlot name="product:single.form.start" />

      <TintPickers formRef={formRef} />

      {optionsReady && product.options && product.options.length > 0 && (
        <SallaProductOptions
          key={product.id}
          // constructor-only options parse: push data via ref on client remount
          ref={optionsRef}
          options={JSON.stringify(product.options)}
          productId={product.id}
          config={JSON.stringify({ 'single-option': { type: 'button' } })}
        />
      )}

      {product.has_bundle_products && (
        <SallaMultipleBundleProduct bundleSections={JSON.stringify(product)} />
      )}

      <WeightAndSizeGuide product={product} />
      <Attachments product={product} />

      <HookSlot name="product:single.form.end" />

      {hasPreorder && (
        <div className="opt">
          <SallaCountDown preOrder={JSON.stringify(product.preorder)} boxed labeled />
        </div>
      )}

      <div className="buy-row">
        <QuantityField product={product} />

        <SallaAddProductButton
          ref={addButtonRef}
          id="add"
          {...(product.is_require_shipping ? { requiredShipping: true } : {})}
          {...(hasPreorder ? { hasPreOrder: true } : {})}
          amount={baseAmount}
          productStatus={product.status}
          productType={product.type}
          productId={product.id}
          type="submit"
          width="wide"
          {...(notify
            ? {
                ...(notify.subscribed ? { isSubscribed: true } : {}),
                channels: notify.channels.join(','),
                ...(notify.subscribed_options
                  ? { subscribedOptions: JSON.stringify(notify.subscribed_options) }
                  : {}),
                ...(notify.options ? { notifyOptionsAvailability: true } : {}),
              }
            : {})}
        >
          <Icon name="bag" className="i-sm" /> {addLabel}
        </SallaAddProductButton>

        <button
          type="button"
          className={`btn btn-outline btn-icon pdp-wish${wishlist.has(id) ? ' on' : ''}`}
          aria-label={t('azel.common.wishlist')}
          onClick={() => wishlist.toggle(id)}
        >
          <Icon name="heart" />
        </button>
      </div>

      {showBuyNow && (
        <button
          type="button"
          className="btn btn-lime btn-lg btn-block buy-now"
          id="buy-now"
          disabled={buying}
          onClick={onBuyNow}
        >
          {get<string>('buy_now_text') || t('azel.product.buy_now')}
        </button>
      )}

      {product.giftable && (
        <SallaGifting
          className="opt"
          productId={product.id}
          {...(product.is_require_shipping ? { physicalProducts: true } : {})}
        />
      )}
    </form>
  );
}
