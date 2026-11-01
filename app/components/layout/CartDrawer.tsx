import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { Image, Link } from '@salla.sa/twilight-theme-engine/common';
import { useMoney } from '@salla.sa/twilight-theme-engine/hooks/useMoney';
import { useTranslation } from '@salla.sa/twilight-theme-engine/i18n';
import { useLocation, useNavigate } from '@salla.sa/twilight-theme-engine/providers';
import { Icon } from '../azel/Icon';
import { useSettings } from '../azel/useAzel';
import { useLayers } from './Layers';
import placeholderUrl from '../../assets/placeholder.png';
import { buyNow } from '../../lib/azel/buy-now';
import { sdk, whenSdkReady } from '../../lib/azel/sdk';
import { amount } from '../../lib/azel/utils';

interface DrawerItemOption {
  name?: string;
  value?: unknown;
  details?: { id?: unknown; name?: string; is_selected?: boolean }[];
}

interface DrawerItem {
  id: string | number;
  url?: string;
  name?: string;
  product_name?: string;
  image?: string;
  product_image?: string;
  quantity?: number;
  total?: unknown;
  type?: string;
  is_available?: boolean;
  is_hidden_quantity?: boolean;
  options?: DrawerItemOption[];
}

interface DrawerCart {
  items?: DrawerItem[];
  sub_total?: unknown;
  total?: unknown;
  free_shipping_bar?: {
    minimum_amount?: unknown;
    remaining?: unknown;
    percent?: unknown;
    has_free_shipping?: boolean;
  } | null;
}

interface CartDrawerValue {
  openCart: () => void;
  isCartPage: boolean;
}

const CartDrawerContext = createContext<CartDrawerValue | null>(null);

export function useCartDrawer(): CartDrawerValue {
  const value = useContext(CartDrawerContext);
  if (!value) throw new Error('useCartDrawer must be used inside ThemeLayout');
  return value;
}

/** For a choice option Salla's value is the picked detail's id: show the detail's name. */
function itemOptions(item: DrawerItem): string {
  const options = Array.isArray(item.options) ? item.options : [];
  return options
    .map((o) => {
      if (o == null) return '';
      const picked = (o.details ?? [])
        .filter((d) => d.is_selected || String(d.id) === String(o.value))
        .map((d) => d.name);
      const value = picked.length
        ? picked.join('، ')
        : typeof o.value === 'string' || typeof o.value === 'number'
          ? o.value
          : '';
      return value ? (o.name ? `${o.name}: ${value}` : String(value)) : '';
    })
    .filter(Boolean)
    .join(' · ');
}

/** The store's free-shipping rule, or the `free_shipping_threshold` setting. */
function FreeShipping({ cart }: { cart: DrawerCart }) {
  const { t } = useTranslation();
  const { format } = useMoney();
  const get = useSettings();
  const bar = cart.free_shipping_bar;
  const sub = amount(cart.sub_total);
  let remaining: number;
  let percent: number;
  let done: boolean;

  if (bar && bar.minimum_amount) {
    remaining = amount(bar.remaining);
    percent = Number(bar.percent) || 0;
    done = !!bar.has_free_shipping || remaining <= 0;
  } else {
    const minimum = Number(get('free_shipping_threshold', 0)) || 0;
    if (!minimum) return null;
    remaining = Math.max(0, minimum - sub);
    percent = Math.min(100, (sub / minimum) * 100);
    done = remaining <= 0;
  }

  const [before, after = ''] = t('azel.cart.free_left').split(':amount');
  return (
    <div className="free-ship">
      {done ? (
        <>
          <Icon name="check" className="i-xs" /> {t('azel.cart.free_done')}
        </>
      ) : (
        <>
          {before}
          <b className="num">{format(remaining)}</b>
          {after}
        </>
      )}
      <div className="progress">
        <span style={{ width: `${done ? 100 : Math.min(100, percent)}%` }} />
      </div>
    </div>
  );
}

function DrawerRow({
  item,
  busy,
  onStep,
  onRemove,
}: {
  item: DrawerItem;
  busy: boolean;
  onStep: (item: DrawerItem, step: number) => void;
  onRemove: (item: DrawerItem) => void;
}) {
  const { t } = useTranslation();
  const { format } = useMoney();
  const meta = itemOptions(item);
  const locked = item.is_hidden_quantity || item.type === 'donating';
  const url = item.url ?? '#';
  return (
    <div className={`mini-item${busy ? ' busy' : ''}`}>
      <a href={url}>
        {item.product_image || item.image ? (
          <Image src={item.product_image || item.image} alt="" srcSetWidths={[160]} sizes="72px" />
        ) : (
          <img src={placeholderUrl} alt="" loading="lazy" />
        )}
      </a>
      <div>
        <h4>
          <a href={url}>{item.product_name || item.name || ''}</a>
        </h4>
        {meta && <div className="meta">{meta}</div>}
        {!locked && (
          <div className="qty sm">
            <button type="button" aria-label={t('azel.cart.more')} onClick={() => onStep(item, 1)}>
              <Icon name="plus" className="i-xs" />
            </button>
            <b>{item.quantity}</b>
            <button type="button" aria-label={t('azel.cart.less')} onClick={() => onStep(item, -1)}>
              <Icon name="minus" className="i-xs" />
            </button>
          </div>
        )}
      </div>
      <div className="mi-end">
        <div className="price">
          {item.is_available === false ? t('azel.common.sold_out') : format(amount(item.total))}
        </div>
        <button
          type="button"
          className="mi-rm"
          aria-label={t('azel.cart.remove')}
          onClick={() => onRemove(item)}
        >
          <Icon name="trash" className="i-sm" />
        </button>
      </div>
    </div>
  );
}

/**
 * The side cart. It replaces Salla's add-to-cart popup: it opens on every add,
 * from a card, the product page or any Salla component, except on the cart page
 * itself and during «اشترِ الآن».
 */
export function CartDrawerProvider({ children }: { children: ReactNode }) {
  const { t } = useTranslation();
  const { format } = useMoney();
  const get = useSettings();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { drawer, openDrawer, closeDrawers } = useLayers();
  const [cart, setCart] = useState<DrawerCart | null>(null);
  const [busyId, setBusyId] = useState<string | number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const busyRef = useRef(false);

  const isCartPage = /\/cart\/?$/.test(pathname);
  const isCartPageRef = useRef(isCartPage);
  isCartPageRef.current = isCartPage;

  const loadCart = useCallback(async () => {
    try {
      const res = await sdk()?.api?.cart?.details?.();
      const data = res?.data as { cart?: DrawerCart } | DrawerCart | undefined;
      setCart((data as { cart?: DrawerCart })?.cart || (data as DrawerCart) || { items: [] });
    } catch (error) {
      // no cart yet (a first visit) reads as an empty cart
      setCart({ items: [] });
      sdk()?.logger?.error?.('azel:: cart details', error);
    }
  }, []);

  const openCart = useCallback(() => {
    openDrawer('cart');
    void loadCart();
  }, [openDrawer, loadCart]);

  useEffect(
    () =>
      whenSdkReady(() => {
        const event = sdk()?.event;
        const onAdded = (response?: { data?: { cart?: DrawerCart } }) => {
          if (isCartPageRef.current || buyNow.active) return;
          const added = response?.data?.cart;
          if (added?.items) {
            setCart(added);
            openDrawer('cart');
          } else {
            openDrawer('cart');
            void loadCart();
          }
        };
        event?.on?.('cart::item.added', onAdded);
        return () => event?.off?.('cart::item.added', onAdded);
      }),
    [openDrawer, loadCart]
  );

  const mutate = useCallback(
    (item: DrawerItem, request: Promise<unknown> | undefined) => {
      busyRef.current = true;
      setBusyId(item.id);
      Promise.resolve(request)
        .then(() => loadCart())
        .catch((error) => sdk()?.logger?.error?.('azel:: cart update', error))
        .finally(() => {
          busyRef.current = false;
          setBusyId(null);
        });
    },
    [loadCart]
  );

  const onStep = (item: DrawerItem, step: number) => {
    if (busyRef.current) return;
    const next = (Number(item.quantity) || 1) + step;
    mutate(
      item,
      next < 1 ? sdk()?.cart?.deleteItem?.(item.id) : sdk()?.cart?.updateItem?.({ id: item.id, quantity: next })
    );
  };

  const onRemove = (item: DrawerItem) => {
    if (busyRef.current) return;
    mutate(item, sdk()?.cart?.deleteItem?.(item.id));
  };

  // The drawer has no cart page around it: if submit is not possible (a guest
  // without login, say) the cart page takes over.
  const onCheckout = () => {
    setSubmitting(true);
    sdk()?.event?.once?.('cart::submit.failed', () => setSubmitting(false));
    try {
      sdk()?.cart?.submit?.();
    } catch {
      setSubmitting(false);
      navigate('/cart');
    }
  };

  const items = cart?.items ?? [];
  const value = useMemo(() => ({ openCart, isCartPage }), [openCart, isCartPage]);

  return (
    <CartDrawerContext.Provider value={value}>
      {children}
      <aside
        className={`drawer drawer-end az${drawer === 'cart' ? ' open' : ''}`}
        id="cart"
        aria-label={t('azel.cart.title')}
      >
        <div className="drawer-head">
          <h3>
            <Icon name="bag" /> {t('azel.cart.title')}
          </h3>
          <button className="h-btn" type="button" onClick={closeDrawers} aria-label={t('azel.common.close')}>
            <Icon name="x" />
          </button>
        </div>
        <div className="drawer-body" id="mini-cart">
          {!cart && <div className="cart-loading">…</div>}
          {cart && !items.length && (
            <div className="cart-empty">
              <div className="empty-ico">
                <Icon name="bag" className="i-lg" />
              </div>
              <h4>{t('azel.cart.empty_title')}</h4>
              <p>{get<string>('cart_empty_text') || t('azel.cart.empty_text')}</p>
              <Link to="/" className="btn" onClick={closeDrawers}>
                {t('azel.cart.empty_btn')}
              </Link>
            </div>
          )}
          {items.map((item) => (
            <DrawerRow
              key={item.id}
              item={item}
              busy={busyId === item.id}
              onStep={onStep}
              onRemove={onRemove}
            />
          ))}
        </div>
        <div className="drawer-foot" id="mini-cart-foot">
          {cart && items.length > 0 && (
            <>
              <FreeShipping cart={cart} />
              <div className="sum-row total">
                <span>{t('azel.cart.total')}</span>
                <span className="price">{format(amount(cart.sub_total ?? cart.total))}</span>
              </div>
              <p className="mc-note">{t('azel.cart.note')}</p>
              <div className="mc-btns">
                <Link to="/cart" className="btn btn-outline" onClick={closeDrawers}>
                  {t('azel.cart.view')}
                </Link>
                <button type="button" className="btn" disabled={submitting} onClick={onCheckout}>
                  {t('azel.cart.checkout')}
                </button>
              </div>
            </>
          )}
        </div>
      </aside>
    </CartDrawerContext.Provider>
  );
}
