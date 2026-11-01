import { SallaTrustBadges } from '@salla.sa/twilight-components-react/trust-badges';
import { Link } from '@salla.sa/twilight-theme-engine/common';
import { HookSlot } from '@salla.sa/twilight-theme-engine/hooks';
import { useTranslation } from '@salla.sa/twilight-theme-engine/i18n';
import { MadeWithSalla } from '@salla.sa/twilight-theme-engine/layout';
import { useTwilight } from '@salla.sa/twilight-theme-engine/providers';
import { AzLink } from '../azel/AzLink';
import { Icon } from '../azel/Icon';
import { useSettings } from '../azel/useAzel';
import { digitsOnly, noSpaces, parseLinks, plainText } from '../../lib/azel/utils';
import businessPlatformUrl from '../../assets/business-platform.png';
import madaUrl from '../../assets/pay/mada.png';
import cardUrl from '../../assets/pay/credit_card.png';
import applePayUrl from '../../assets/pay/apple_pay.png';
import stcPayUrl from '../../assets/pay/stc_pay.png';
import tabbyUrl from '../../assets/pay/tabby_installment.png';
import tamaraUrl from '../../assets/pay/tamara_installment.png';
import bankUrl from '../../assets/pay/bank.png';

function FooterColumn({ title, links }: { title?: string; links?: string }) {
  const items = parseLinks(links);
  if (!title && !String(links ?? '').trim()) return null;
  return (
    <div>
      {title && <h3>{title}</h3>}
      <div className="footer-links">
        {items.map((link) => (
          <AzLink key={`${link.label}-${link.url}`} href={link.url}>
            {link.label}
          </AzLink>
        ))}
      </div>
    </div>
  );
}

function SocialLink({ href, label, children }: { href: string; label: string; children: React.ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noopener" aria-label={label}>
      {children}
    </a>
  );
}

function PayIcon({ show, src, label }: { show: boolean; src: string; label: string }) {
  if (!show) return null;
  return (
    <span className="pay-ico" title={label}>
      <img src={src} alt={label} loading="lazy" />
    </span>
  );
}

/**
 * The Azel footer: brand, two link columns, customer service, then the documents
 * Salla's review requires (trust badges, the business-platform certificate, the
 * tax number), which have no setting to hide them. The link columns are theme
 * settings: Salla's footer menu is one flat list, so it cannot carry two titled
 * columns.
 */
export function Footer() {
  const { t } = useTranslation();
  const { store } = useTwilight();
  const get = useSettings();
  const contacts = (store?.contacts ?? {}) as {
    whatsapp?: string;
    mobile?: string;
    phone?: string;
    email?: string;
  };
  const social = (store?.social ?? {}) as Record<string, string | undefined>;
  const settings = store?.settings as
    | { certificate?: { id?: string } | string; tax?: { number?: string } }
    | undefined;

  const storeName = store?.name || t('azel.common.store');
  const whatsapp = digitsOnly(get<string>('whatsapp_number') || contacts.whatsapp || '');
  const phone = noSpaces(contacts.mobile || contacts.phone || '');
  const phoneDisplay = get<string>('phone_display') || phone;
  const email = contacts.email;
  const tiktok = get<string>('social_tiktok') || social.tiktok;
  const logo = get<string>('footer_logo');
  const description = plainText(get<string>('footer_desc') || store?.description || '');
  const contactTitle = get<string>('footer_contact_title') || t('azel.footer.customer_service');
  const certificateRaw = settings?.certificate;
  const certificate =
    typeof certificateRaw === 'object' ? (certificateRaw?.id ?? '') : (certificateRaw ?? '');
  const taxNumber = settings?.tax?.number;
  const copyright = get<string>('footer_copyright') || `${storeName}${t('azel.footer.rights')}`;

  return (
    <footer className="site-footer az">
      <HookSlot name="footer:start" />
      <div className="container footer-top">
        <div className="footer-brand">
          <Link to="/" aria-label={storeName}>
            {logo ? (
              <img src={logo} alt={storeName} width={250} height={91} loading="lazy" />
            ) : store?.logo ? (
              <img className="to-white" src={store.logo} alt={storeName} width={250} height={91} loading="lazy" />
            ) : (
              <span className="logo-text">{storeName}</span>
            )}
          </Link>
          {description && <p>{description}</p>}
          <div className="socials">
            {social.instagram && (
              <SocialLink href={social.instagram} label={t('azel.footer.instagram')}>
                <Icon name="insta" className="i-sm" />
              </SocialLink>
            )}
            {tiktok && (
              <SocialLink href={tiktok} label={t('azel.footer.tiktok')}>
                <Icon name="tiktok" className="i-sm" />
              </SocialLink>
            )}
            {whatsapp && (
              <SocialLink href={`https://wa.me/${whatsapp}`} label={t('azel.footer.whatsapp')}>
                <Icon name="wa" className="i-sm" />
              </SocialLink>
            )}
            {social.snapchat && (
              <SocialLink href={social.snapchat} label={t('azel.footer.snapchat')}>
                <svg className="i i-sm" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M12 3.5c3 0 5 2.2 5 5.2v2.6l1.8-.6.6 1.2-2.2 1.3c.7 1.9 2 3.1 3.8 3.6l-.3 1.2-2.3.4-.5 1.6-2.3-.2c-1 .9-2.4 1.7-3.6 1.7s-2.6-.8-3.6-1.7l-2.3.2-.5-1.6-2.3-.4-.3-1.2c1.8-.5 3.1-1.7 3.8-3.6L4.6 12l.6-1.2 1.8.6V8.7c0-3 2-5.2 5-5.2z" />
                </svg>
              </SocialLink>
            )}
            {social.twitter && (
              <SocialLink href={social.twitter} label="X">
                <svg className="i i-sm" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M4 4l16 16M20 4L4 20" />
                </svg>
              </SocialLink>
            )}
            {social.youtube && (
              <SocialLink href={social.youtube} label={t('azel.footer.youtube')}>
                <svg className="i i-sm" viewBox="0 0 24 24" aria-hidden="true">
                  <rect x="2.5" y="5.5" width="19" height="13" rx="4" />
                  <path d="M10 9.2v5.6l4.8-2.8z" />
                </svg>
              </SocialLink>
            )}
            {social.facebook && (
              <SocialLink href={social.facebook} label={t('azel.footer.facebook')}>
                <svg className="i i-sm" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M14.5 8H17V4.5h-2.5A4 4 0 0 0 10.5 8.5V11H8v3.5h2.5V21H14v-6.5h2.6L17 11h-3V8.9c0-.5.4-.9.9-.9z" />
                </svg>
              </SocialLink>
            )}
          </div>
        </div>

        <FooterColumn title={get<string>('footer_col1_title')} links={get<string>('footer_col1_links', '')} />
        <FooterColumn title={get<string>('footer_col2_title')} links={get<string>('footer_col2_links', '')} />

        {(whatsapp || phone || email) && (
          <div className="footer-contact-col">
            <h3>{contactTitle}</h3>
            <div className="footer-contact">
              {whatsapp && (
                <a href={`https://wa.me/${whatsapp}`} target="_blank" rel="noopener">
                  <span className="ico">
                    <Icon name="wa" className="i-sm" />
                  </span>
                  <span>
                    {t('azel.footer.whatsapp')}
                    <br />
                    <span className="ltr">{phoneDisplay || whatsapp}</span>
                  </span>
                </a>
              )}
              {phone && (
                <a href={`tel:${phone}`}>
                  <span className="ico">
                    <Icon name="phone" className="i-sm" />
                  </span>
                  <span>
                    {t('azel.footer.call')}
                    <br />
                    <span className="ltr">{phoneDisplay}</span>
                  </span>
                </a>
              )}
              {email && (
                <a href={`mailto:${email}`}>
                  <span className="ico">
                    <Icon name="mail" className="i-sm" />
                  </span>
                  <span>{email}</span>
                </a>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="container footer-docs">
        <SallaTrustBadges dark />
        {certificate && (
          <div className="f-badge">
            <img
              src={businessPlatformUrl}
              width={40}
              height={38}
              alt={t('azel.footer.business_platform')}
              loading="lazy"
            />
            <div>
              <p>{t('azel.footer.business_platform')}</p>
              <b>
                <bdi>{String(certificate)}</bdi>
              </b>
            </div>
          </div>
        )}
        {taxNumber && (
          <span>
            {t('common.elements.tax_number', 'Tax Number')}:{' '}
            <b>
              <bdi>{taxNumber}</bdi>
            </b>
          </span>
        )}
        {social.maroof && (
          <a href={social.maroof} target="_blank" rel="noopener">
            {t('azel.footer.maroof')}
          </a>
        )}
      </div>

      <div className="container footer-bottom">
        <span>
          <HookSlot
            name="copyright"
            context={{ storeName: store?.name }}
            fallback={
              <>
                © {new Date().getFullYear()} {copyright}
                <MadeWithSalla className="ms-2" />
              </>
            }
          />
        </span>
        <div className="pay" aria-label={t('azel.footer.payment_methods')}>
          <PayIcon show={get('pay_mada', true) !== false} src={madaUrl} label="مدى" />
          <PayIcon show={get('pay_card', true) !== false} src={cardUrl} label="Visa / Mastercard" />
          <PayIcon show={get('pay_applepay', true) !== false} src={applePayUrl} label="Apple Pay" />
          <PayIcon show={get('pay_stc', true) !== false} src={stcPayUrl} label="stc Bank" />
          <PayIcon show={get('pay_tabby', true) !== false} src={tabbyUrl} label="تابي" />
          <PayIcon show={get('pay_tamara', true) !== false} src={tamaraUrl} label="تمارا" />
          <PayIcon show={get('pay_bank', true) !== false} src={bankUrl} label="تحويل بنكي" />
        </div>
      </div>
      <HookSlot name="footer:end" />
    </footer>
  );
}
