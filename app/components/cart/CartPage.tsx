import { useCallback, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { SallaConditionalOffer } from '@salla.sa/twilight-components-react/conditional-offer';
import { SallaOffer } from '@salla.sa/twilight-components-react/offer';
import { HookSlot, usePageConfig } from '@salla.sa/twilight-theme-engine/hooks';
import { useTranslation } from '@salla.sa/twilight-theme-engine/i18n';
import { Breadcrumb } from '@salla.sa/twilight-theme-engine/common';
import { CartSummary, SeoCartWidget } from '@salla.sa/twilight-theme-engine/cart';
import { useTwilight } from '@salla.sa/twilight-theme-engine/providers';
import { CartSkeleton } from '@salla.sa/twilight-theme-engine/skeleton';
import { loyalty } from '@salla.sa/twilight-theme-engine/api/loyalty';
import { cart } from '@salla.sa/twilight-theme-engine/api/cart';
import type { CartPageProps } from '@salla.sa/twilight-theme-engine/routes/cart';
import { AzLink } from '../azel/AzLink';
import { Icon } from '../azel/Icon';
import { useSettings } from '../azel/useAzel';
import { CartItem } from './CartItem';

/** The design's three checkout steps; the theme setting `cart_steps_enabled` hides them. */
function CheckoutSteps() {
  const { t } = useTranslation();
  const get = useSettings();
  if (get('cart_steps_enabled', true) === false) return null;
  return (
    <div className="checkout-steps az">
      <span className="cs active">
        <i>1</i> {t('azel.cart.step_cart')}
      </span>
      <span className="cs-line" />
      <span className="cs">
        <i>2</i> {t('azel.cart.step_shipping')}
      </span>
      <span className="cs-line" />
      <span className="cs">
        <i>3</i> {t('azel.cart.step_confirm')}
      </span>
    </div>
  );
}

/** The warranty reminder under the items. */
function CartNote() {
  const { t } = useTranslation();
  const get = useSettings();
  const title = get<string>('cart_note_title', '');
  if (!title) return null;
  const linkText = get<string>('cart_note_link_text');
  return (
    <div className="panel az cart-note">
      <span className="cn-ico">
        <Icon name="shield" />
      </span>
      <div className="cn-body">
        <b>{title}</b>
        <p className="muted">
          {get<string>('cart_note_text', '')}
          {linkText && (
            <>
              {' '}
              <a
                href={get<string>('cart_note_link_url') || '#'}
                target="_blank"
                rel="noopener"
                className="link"
              >
                {linkText}
              </a>
            </>
          )}
        </p>
      </div>
      <AzLink href="/" className="link">
        {t('azel.cart.continue')} <Icon name="arrowL" className="i-sm i-flip" />
      </AzLink>
    </div>
  );
}

function EmptyCart() {
  const { t } = useTranslation();
  const get = useSettings();
  return (
    <div className="panel az cart-empty-panel">
      <div className="cart-empty">
        <div className="empty-ico">
          <Icon name="bag" className="i-lg" />
        </div>
        <h4>{t('azel.cart.empty_title')}</h4>
        <p>{get<string>('cart_empty_text') || t('azel.cart.empty_text')}</p>
        <AzLink href="/" className="btn">
          {t('azel.cart.empty_btn')}
        </AzLink>
      </div>
    </div>
  );
}

/**
 * Theme fork of the engine `CartPage`.
 *
 * Same data flow as upstream, in the Azel design: the checkout steps, one panel
 * for the items under a title, and the warranty reminder under them. An error
 * state with a retry when the cart can't be loaded (upstream keeps its skeleton
 * up for good). Upgrade notes: `FORKS.md`.
 */
function CartPageContent({ page }: CartPageProps) {
  const { store } = useTwilight();
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  // Tells the SDK this is the cart page on a direct load, so `<salla-product-options>`
  // pre-checks each item's selected option.
  usePageConfig(page);
  const { data: loyaltyPoints } = useQuery(loyalty.queries.points());

  const cartIdQuery = useQuery(cart.queries.currentId());
  const cartId = cartIdQuery.data;

  const cartQuery = useQuery({
    ...cart.queries.detail(cartId!),
    enabled: !!cartId,
  });
  const cartData = cartQuery.data;

  // Refetch after a row mutates its quantity / gets deleted — the SDK doesn't
  // push cart changes back into React, so item totals and the summary would
  // otherwise stay stale until a page reload.
  const refetchCart = useCallback(() => {
    if (cartId != null) {
      queryClient.invalidateQueries({ queryKey: cart.queries.detail(cartId).queryKey });
    }
  }, [cartId, queryClient]);

  // Belt-and-suspenders: also refetch on any SDK cart event that does fire.
  // Root on/off: onUpdated registers a wrapper that only offUpdated can remove.
  useEffect(() => {
    window.salla?.event?.on?.('cart::updated', refetchCart);
    return () => {
      window.salla?.event?.off?.('cart::updated', refetchCart);
    };
  }, [refetchCart]);

  // A failed request leaves its data undefined, so without this the skeleton
  // stayed up for good (e.g. `cart/<id>` answering an error).
  const failed = cartIdQuery.isError || cartQuery.isError;
  // The SDK knew of no cart.
  const noCart = cartIdQuery.isSuccess && cartId == null;

  if (failed) {
    return (
      <div className="container azel-cart">
        <Breadcrumb page={page} className="crumbs py-5" />
        <div className="no-content-placeholder">
          <i className="sicon-shopping-bag icon"></i>
          <p>{t('common.errors.error_occurred', 'Something went wrong')}</p>
          <button
            type="button"
            className="btn btn--outline-primary btn--rounded-full"
            onClick={() => {
              if (cartIdQuery.isError) cartIdQuery.refetch();
              else cartQuery.refetch();
            }}
          >
            {t('common.elements.try_again', 'Try again')}
          </button>
        </div>
      </div>
    );
  }

  if (!noCart && (cartId == null || cartData === undefined)) {
    return <CartSkeleton />;
  }

  // No cart: it was already turned into an order, shown empty like Twig.
  if (noCart || !cartData || cartData.items.length === 0) {
    return (
      <div className="container azel-cart">
        <Breadcrumb page={page} className="crumbs py-5" />
        <h1 className="sr-only">{t('common.titles.cart', 'Cart')}</h1>
        <CheckoutSteps />
        <div className="pt-5 pb-32 lg:pb-20">
          <EmptyCart />
        </div>
      </div>
    );
  }

  return (
    <div className="container azel-cart">
      {/* Analytics — no visible UI, fires GTM checkout events */}
      <SeoCartWidget cart={cartData} />

      <Breadcrumb page={page} className="crumbs py-5" />
      <h1 className="sr-only">{t('common.titles.cart', 'Cart')}</h1>
      <CheckoutSteps />
      <SallaConditionalOffer />

      <HookSlot name="cart:start" />

      <div className="pt-5 flex flex-col items-start lg:flex-row pb-32 lg:pb-20">
        <div className="main-content w-full lg:w-[calc(100%-384px)]">
          <HookSlot name="cart:items.start" context={{ cartItems: cartData.items }} />

          <h2 className="panel-title az">
            <Icon name="bag" /> {t('azel.cart.title')}{' '}
            <span className="muted">
              ({cartData.items.length} {t('azel.cart.items')})
            </span>
          </h2>

          {cartData.items.map((item, index) => (
            <CartItem key={item.id} item={item} isFirst={index === 0} onMutated={refetchCart} />
          ))}

          {cartData.options?.length > 0 && (
            <div className="cart-options">
              {cartData.options.map((option) => (
                <form
                  key={option.id}
                  className="first:pt-5 relative"
                  onChange={(e) => window.salla?.form.onChange('cart.updateItem', e)}
                  id={`item-${option.id}`}
                >
                  <input type="hidden" name="id" value={option.id} />
                  <input type="hidden" name="quantity" value={option.quantity} />
                  {option.options && option.options.length > 0 && (
                    // Raw element, like CartItem: the wrapper sets `options` too late and it renders empty.
                    <salla-product-options
                      key={JSON.stringify(option.options)}
                      options={JSON.stringify(option.options)}
                      product-id={option.id}
                    />
                  )}
                </form>
              ))}
            </div>
          )}

          <SallaOffer />
          <CartNote />
          <HookSlot name="cart:items.end" />
        </div>

        <CartSummary
          cart={cartData}
          applyCouponEnabled={store.settings?.cart?.apply_coupon_enabled}
          taxAmount={cartData.tax_amount}
          key={cartData.id}
          loyalty={cartData.loyalty}
          gift={cartData.gift}
          loyaltyPoints={loyaltyPoints ?? undefined}
        />
      </div>

      <HookSlot name="cart:end" />
    </div>
  );
}

export function CartPage(props: CartPageProps) {
  return <CartPageContent {...props} />;
}
