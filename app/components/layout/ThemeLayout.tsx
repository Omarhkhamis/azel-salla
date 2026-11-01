import { lazy, Suspense, useEffect } from 'react';
import type { ReactNode } from 'react';
import themeTranslations from 'virtual:twilight/theme-translations';
import { useUser } from '@salla.sa/twilight-theme-engine/hooks/useUser';
import { useTranslation } from '@salla.sa/twilight-theme-engine/i18n';
import { useTwilight } from '@salla.sa/twilight-theme-engine/providers';
import { useSettings } from '../azel/useAzel';
import { fillComponentTranslations, type ComponentLang } from '../../lib/componentTranslations';
import { hexColor, digitsOnly } from '../../lib/azel/utils';
import { CartDrawerProvider } from './CartDrawer';
import { Footer } from './Footer';
import { Header } from './Header';
import { LayersProvider } from './Layers';
import { Toasts } from './Toasts';

const SallaLoginModal = lazy(() =>
  import('@salla.sa/twilight-components-react/login-modal').then((m) => ({
    default: m.SallaLoginModal,
  }))
);
const SallaScopes = lazy(() =>
  import('@salla.sa/twilight-components-react/scopes').then((m) => ({
    default: m.SallaScopes,
  }))
);
const SallaOfferModal = lazy(() =>
  import('@salla.sa/twilight-components-react/offer-modal').then((m) => ({
    default: m.SallaOfferModal,
  }))
);
const SallaLocalizationModal = lazy(() =>
  import('@salla.sa/twilight-components-react/localization-modal').then((m) => ({
    default: m.SallaLocalizationModal,
  }))
);

export interface ThemeLayoutProps {
  children: ReactNode;
}

/** The modals every page needs, each gated on whether the store needs it. */
function GlobalModals() {
  const { store, currency } = useTwilight();
  const { locale } = useTranslation();
  const { isLoggedIn } = useUser();
  const showLocalization =
    !!store?.settings?.is_multilingual || !!store?.settings?.currencies_enabled;

  return (
    <>
      <Suspense>
        <SallaOfferModal />
      </Suspense>
      {showLocalization && (
        <Suspense>
          <SallaLocalizationModal
            language={locale}
            currency={currency?.code || 'SAR'}
            suppressHydrationWarning
          />
        </Suspense>
      )}
      {!isLoggedIn && (
        <Suspense>
          <SallaLoginModal
            isEmailAllowed={store?.settings?.auth?.email_allowed}
            isMobileAllowed={store?.settings?.auth?.mobile_allowed}
            suppressHydrationWarning
          />
        </Suspense>
      )}
      {store?.scope && (
        <Suspense>
          <SallaScopes
            selection={store?.scope?.display_as === 'popup' ? 'mandatory' : 'optional'}
            suppressHydrationWarning
          />
        </Suspense>
      )}
    </>
  );
}

/**
 * The merchant's four identity colours. A colour is declared only when it is a
 * plain hex value: this lands inside `<style>`, where escaping does not apply.
 */
function Palette() {
  const get = useSettings();
  const palette: [string, unknown][] = [
    ['--green-700', get('color_green')],
    ['--green-900', get('color_green_dark')],
    ['--green-950', get('color_green_darkest')],
    ['--lime', get('color_lime')],
  ];
  const css = palette
    .map(([name, value]) => {
      const hex = hexColor(value);
      return hex ? `${name}:${hex};` : '';
    })
    .join('');
  if (!css) return null;
  return <style dangerouslySetInnerHTML={{ __html: `:root{${css}}` }} />;
}

/** The floating WhatsApp button: the setting's number, or the store's own. */
function WhatsAppFloat() {
  const { t } = useTranslation();
  const { store } = useTwilight();
  const get = useSettings();
  const contacts = store?.contacts as { whatsapp?: string } | undefined;
  const number = digitsOnly(get<string>('whatsapp_number') || contacts?.whatsapp || '');
  if (get('whatsapp_enabled', true) === false || !number) return null;
  const label = t('azel.common.whatsapp_cta');
  return (
    <a
      className="wa-float"
      href={`https://wa.me/${number}`}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      title={label}
    >
      <svg
        width="28"
        height="28"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        focusable="false"
      >
        <path d="M3.5 20.5 5 16a8.5 8.5 0 1 1 3.2 3.1L3.5 20.5Z" />
        <path d="M9 8.5c0 3.5 3 6.5 6.5 6.5l1-1.6-2-1-1 .9a5 5 0 0 1-2.8-2.8l.9-1-1-2L9 8.5Z" />
      </svg>
    </a>
  );
}

/**
 * The Azel page frame, passed to `<TwilightProvider layout={ThemeLayout}>`: header,
 * `<main id="main-content">`, footer, the layers and the global modals.
 */
export function ThemeLayout({ children }: ThemeLayoutProps) {
  // Fill the web components' strings the store's pack lacks from the theme's
  // locale files, each time a pack loads (`subscribe` also runs at once when one already has).
  useEffect(() => {
    const lang = window.salla?.lang as
      | (ComponentLang & { subscribe?: (fn: () => void) => () => void })
      | undefined;
    if (typeof lang?.subscribe !== 'function' || typeof lang.add !== 'function') return;
    return lang.subscribe(() => fillComponentTranslations(lang, themeTranslations));
  }, []);

  return (
    <LayersProvider>
      <CartDrawerProvider>
        <Palette />
        <div className="app-inner flex flex-col min-h-full" suppressHydrationWarning>
          <Header />
          <main id="main-content" role="main" className="flex-1">
            {children}
          </main>
          <Footer />
        </div>
        <WhatsAppFloat />
        <Toasts />
        <GlobalModals />
      </CartDrawerProvider>
    </LayersProvider>
  );
}
