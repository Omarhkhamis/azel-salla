import { Fragment, useEffect, useMemo, useRef, useState, type MouseEvent } from 'react';
import { useQuery } from '@tanstack/react-query';
import { menu } from '@salla.sa/twilight-theme-engine/api/menu';
import { SallaCartSummary } from '@salla.sa/twilight-components-react/cart-summary';
import { SallaUserMenu } from '@salla.sa/twilight-components-react/user-menu';
import { Link } from '@salla.sa/twilight-theme-engine/common';
import { HookSlot } from '@salla.sa/twilight-theme-engine/hooks';
import { useUser } from '@salla.sa/twilight-theme-engine/hooks/useUser';
import { useTranslation } from '@salla.sa/twilight-theme-engine/i18n';
import { PageAdvertisements } from '@salla.sa/twilight-theme-engine/layout';
import { useLocation, useTwilight } from '@salla.sa/twilight-theme-engine/providers';
import type { MenuItem } from '@salla.sa/twilight-theme-engine/types';
import { AzLink } from '../azel/AzLink';
import { CopyButton } from '../azel/CopyButton';
import { Icon } from '../azel/Icon';
import { useSettings } from '../azel/useAzel';
import { useLayers } from './Layers';
import { SearchPanel } from './SearchPanel';
import { useNavFit } from './useNavFit';
import { useCartDrawer } from './CartDrawer';
import { digitsOnly, noSpaces, parseLinks, type LinkLine } from '../../lib/azel/utils';
import { sdk } from '../../lib/azel/sdk';

const titled = (items: MenuItem[] | undefined) => (items ?? []).filter((m) => m && m.title);

/** The page being viewed (browser only), the way the design marks its active link. */
function useHere() {
  const { pathname, searchStr } = useLocation();
  const [here, setHere] = useState<string | null>(null);
  useEffect(() => {
    setHere((window.location.pathname.replace(/\/+$/, '') || '/') + window.location.search);
  }, [pathname, searchStr]);
  return here;
}

function isHere(url: string, here: string | null) {
  if (!here || !url || url.startsWith('#')) return false;
  try {
    const u = new URL(url, window.location.href);
    if (u.origin !== window.location.origin) return false;
    return (u.pathname.replace(/\/+$/, '') || '/') + u.search === here;
  } catch {
    return false;
  }
}

function Topbar() {
  const { t } = useTranslation();
  const get = useSettings();
  const start = get<string>('topbar_text_start', '');
  const strong = get<string>('topbar_text_strong', '');
  const end = get<string>('topbar_text_end', '');
  const code = String(get('topbar_coupon', '') ?? '').trim();
  if (get('topbar_enabled', true) === false || !(start || strong || end || code)) return null;
  return (
    <div className="topbar az" aria-label={t('azel.header.announcements')}>
      <div className="container">
        <Icon name="tag" className="i-xs" />
        <span>
          {start}
          {strong && (
            <>
              {' '}
              <strong>{strong}</strong>
            </>
          )}
          {end && ` ${end}`}
        </span>
        {code && (
          <CopyButton code={code} className="coupon" label={t('azel.common.copy_code')}>
            {code}
            <span>{t('azel.common.copy')}</span>
          </CopyButton>
        )}
      </div>
    </div>
  );
}

/** A dashboard menu item with sub-items → the design's mega menu. */
function MegaItem({
  item,
  active,
  allLabel,
  hidden,
}: {
  item: MenuItem;
  active: boolean;
  allLabel: string;
  hidden: boolean;
}) {
  const kids = titled(item.children);
  return (
    <div className="nav-drop" hidden={hidden}>
      <AzLink href={item.url} aria-haspopup="true" className={active ? 'active' : undefined}>
        {item.title} <Icon name="chevD" className="i-xs" />
      </AzLink>
      <div className="mega" role="menu">
        {kids.map((c) => {
          const grandkids = titled(c.children);
          return (
            <AzLink key={c.id} href={c.url} className="mega-item" role="menuitem">
              <span className="mega-img">
                {c.image ? (
                  <img src={c.image} alt="" loading="lazy" />
                ) : (
                  <Icon name="box" className="i-sm" />
                )}
              </span>
              <span>
                <b>{c.title}</b>
                {grandkids.length > 0 && (
                  <small>
                    {grandkids
                      .map((g) => g.title)
                      .slice(0, 3)
                      .join('، ')}
                  </small>
                )}
              </span>
            </AzLink>
          );
        })}
        {item.url && item.url !== '#' && (
          <AzLink href={item.url} className="mega-all">
            {allLabel} <Icon name="arrowL" className="i-sm i-flip" />
          </AzLink>
        )}
      </div>
    </div>
  );
}

interface NavEntry {
  key: string;
  url: string;
  label: string;
  item?: MenuItem;
}

function MainNav({ entries }: { entries: NavEntry[] }) {
  const { t } = useTranslation();
  const here = useHere();
  const { navRef, tight, count, measuring } = useNavFit(entries.length);

  const hidden = entries.slice(count);
  return (
    <nav
      ref={navRef}
      className={`main-nav${tight ? ' nav-tight' : ''}`}
      id="nav"
      aria-label={t('azel.header.main_menu')}
    >
      {entries.map((entry, index) => {
        const active = isHere(entry.url, here);
        const hide = index >= count;
        if (entry.item && titled(entry.item.children).length) {
          return (
            <MegaItem
              key={entry.key}
              item={entry.item}
              active={active}
              hidden={hide}
              allLabel={t('azel.header.browse_all')}
            />
          );
        }
        return (
          <AzLink key={entry.key} href={entry.url} hidden={hide} className={active ? 'active' : undefined}>
            {entry.label}
          </AzLink>
        );
      })}
      {(measuring || hidden.length > 0) && (
        <div
          className="nav-drop nav-more"
          style={measuring ? { visibility: 'hidden', position: 'absolute' } : undefined}
        >
          <a
            href="#"
            aria-haspopup="true"
            role="button"
            onClick={(e: MouseEvent) => e.preventDefault()}
          >
            {t('azel.header.more')} <Icon name="chevD" className="i-xs" />
          </a>
          <div className="mega" role="menu">
            {hidden.map((entry) => (
              <AzLink
                key={entry.key}
                href={entry.url}
                role="menuitem"
                className={`more-item${isHere(entry.url, here) ? ' active' : ''}`}
              >
                {entry.label}
              </AzLink>
            ))}
          </div>
        </div>
      )}
    </nav>
  );
}

function MobileNav({
  entries,
  whatsapp,
  phone,
}: {
  entries: NavEntry[];
  whatsapp: string;
  phone: string;
}) {
  const { t } = useTranslation();
  const { store } = useTwilight();
  const { isLoggedIn } = useUser();
  const { drawer, closeDrawers } = useLayers();
  const here = useHere();
  const storeName = store?.name || t('azel.common.store');
  const chev = <Icon name="chevL" className="i-sm i-flip" />;

  return (
    <aside
      className={`drawer drawer-start az${drawer === 'mnav' ? ' open' : ''}`}
      id="mnav"
      aria-label={t('azel.common.menu')}
    >
      <div className="drawer-head">
        {store?.logo ? (
          <img src={store.logo} alt={storeName} />
        ) : (
          <span className="logo-text">{storeName}</span>
        )}
        <button className="h-btn" type="button" onClick={closeDrawers} aria-label={t('azel.common.close')}>
          <Icon name="x" />
        </button>
      </div>
      <div className="drawer-body">
        <nav className="mobile-nav" id="mobile-nav">
          {entries.map((entry) => {
            const kids = titled(entry.item?.children);
            if (kids.length) {
              return (
                <Fragment key={entry.key}>
                  <span className="mnav-title">{entry.label || t('azel.header.sections')}</span>
                  {kids.map((c) => (
                    <AzLink
                      key={c.id}
                      href={c.url}
                      className={`mnav-cat${isHere(c.url, here) ? ' active' : ''}`}
                    >
                      <span>
                        {c.image ? <img src={c.image} alt="" /> : <Icon name="box" className="i-sm" />}{' '}
                        {c.title}
                      </span>
                      {chev}
                    </AzLink>
                  ))}
                  <span className="mnav-sep" />
                </Fragment>
              );
            }
            return (
              <AzLink
                key={entry.key}
                href={entry.url}
                className={isHere(entry.url, here) ? 'active' : undefined}
              >
                {entry.label}
                {chev}
              </AzLink>
            );
          })}
          {isLoggedIn ? (
            <Link to="/account/profile">
              {t('azel.header.account')}
              {chev}
            </Link>
          ) : (
            <a
              href="#"
              onClick={(e) => {
                e.preventDefault();
                closeDrawers();
                sdk()?.event?.dispatch?.('login::open');
              }}
            >
              {t('azel.header.account')}
              {chev}
            </a>
          )}
        </nav>
        {(whatsapp || phone) && (
          <div className="mobile-contact">
            {whatsapp && (
              <a
                href={`https://wa.me/${whatsapp}`}
                target="_blank"
                rel="noopener"
                className="btn btn-wa btn-block"
              >
                <Icon name="wa" /> {t('azel.header.whatsapp')}
              </a>
            )}
            {phone && (
              <a href={`tel:${phone}`} className="btn btn-outline btn-block">
                <Icon name="phone" /> {t('azel.header.call')}
              </a>
            )}
          </div>
        )}
      </div>
    </aside>
  );
}

/**
 * The Azel header: the announcement bar, the sticky bar with the merchant's menu
 * and Salla's own account and cart widgets, and the search panel. The menu drawer
 * sits outside `<header>`: the header's backdrop-filter makes it the containing
 * block of any fixed descendant, which would clip a drawer inside it.
 *
 * Nav sources: `header_links` ("text | link" per line) when filled, otherwise the
 * dashboard's header menu, where an item with sub-items becomes the mega menu;
 * `nav_extra_links` always follows.
 */
export function Header() {
  const { t } = useTranslation();
  const { store } = useTwilight();
  const get = useSettings();
  const { openDrawer, toggleSearch } = useLayers();
  const { openCart, isCartPage } = useCartDrawer();
  const { data: menuItems } = useQuery(menu.queries.header());
  const headerRef = useRef<HTMLElement>(null);
  const [scrolled, setScrolled] = useState(false);

  const storeName = store?.name || t('azel.common.store');
  const headerLinks = String(get('header_links', '') ?? '').trim();
  const extraLinks = String(get('nav_extra_links', '') ?? '').trim();
  const showHome = get('show_home_link', true) !== false;
  const contacts = store?.contacts as { whatsapp?: string; mobile?: string; phone?: string } | undefined;
  const whatsapp = digitsOnly(get<string>('whatsapp_number') || contacts?.whatsapp || '');
  const phone = noSpaces(contacts?.mobile || contacts?.phone || '');

  const entries = useMemo<NavEntry[]>(() => {
    const line = (prefix: string) => (link: LinkLine, i: number): NavEntry => ({
      key: `${prefix}-${i}-${link.label}`,
      url: link.url,
      label: link.label,
    });
    const main: NavEntry[] = headerLinks
      ? parseLinks(headerLinks).map(line('link'))
      : [
          ...(showHome
            ? [{ key: 'home', url: '/', label: t('azel.common.home') } satisfies NavEntry]
            : []),
          ...titled(menuItems).map((item) => ({
            key: `menu-${item.id}`,
            url: item.url,
            label: item.title,
            item,
          })),
        ];
    return [...main, ...parseLinks(extraLinks).map(line('extra'))];
  }, [headerLinks, extraLinks, showHome, menuItems, t]);

  useEffect(() => {
    let ticking = false;
    const update = () => {
      setScrolled(window.scrollY > 10);
      ticking = false;
    };
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(update);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    update();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Salla's cart summary prints «0»; the design shows no badge on an empty cart.
  // The count is its own markup, so nothing in React reaches it.
  useEffect(() => {
    const box = headerRef.current?.querySelector('.header-actions');
    if (!box) return;
    const paint = () =>
      box.querySelectorAll<HTMLElement>('.s-cart-summary-count').forEach((badge) => {
        const digits = String(badge.textContent)
          .replace(/[^\d٠-٩]/g, '')
          .replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)));
        badge.style.display = Number(digits) ? '' : 'none';
      });
    const observer = new MutationObserver(paint);
    observer.observe(box, { childList: true, subtree: true, characterData: true });
    paint();
    return () => observer.disconnect();
  }, []);

  // In this theme the cart is the drawer, so the summary's click is taken over.
  // A middle-click or "open in new tab" still reaches the cart page.
  const onCartClick = (e: MouseEvent) => {
    if (isCartPage || e.button !== 0 || e.metaKey || e.ctrlKey) return;
    e.preventDefault();
    e.stopPropagation();
    openCart();
  };

  return (
    <>
      <HookSlot name="header:start" />
      <PageAdvertisements />
      <Topbar />

      <header
        ref={headerRef}
        className={`site-header az${get('header_is_sticky', true) === false ? ' is-static' : ''}${scrolled ? ' scrolled' : ''}`}
        id="header"
      >
        <div className="container header-inner">
          <button
            className="h-btn menu-toggle"
            type="button"
            onClick={() => openDrawer('mnav')}
            aria-label={t('azel.common.menu')}
          >
            <Icon name="menu" />
          </button>

          <Link to="/" className="logo" aria-label={storeName}>
            {store?.logo ? (
              <img
                src={store.logo}
                alt={storeName}
                width={250}
                height={91}
              />
            ) : (
              <span className="logo-text">{storeName}</span>
            )}
          </Link>

          <MainNav entries={entries} />

          <div className="header-actions">
            <button className="h-btn" type="button" onClick={toggleSearch} aria-label={t('azel.common.search')}>
              <Icon name="search" />
            </button>

            <span className="hide-sm">
              <SallaUserMenu avatarOnly showHeader relativeDropdown />
            </span>

            <span onClickCapture={onCartClick} style={{ display: 'contents' }}>
              <SallaCartSummary>
                <span slot="icon">
                  <Icon name="bag" />
                </span>
              </SallaCartSummary>
            </span>
          </div>
        </div>

        <SearchPanel />
      </header>

      <MobileNav entries={entries} whatsapp={whatsapp} phone={phone} />


      <HookSlot name="header:end" />
    </>
  );
}
