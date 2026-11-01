import type { AnchorHTMLAttributes, ReactNode } from 'react';
import { Link } from '@salla.sa/twilight-theme-engine/common';
import { useTwilight } from '@salla.sa/twilight-theme-engine/providers';

export const isExternalUrl = (url: string, storeUrl: string | undefined) =>
  /^https?:/i.test(url) && !(storeUrl && url.startsWith(storeUrl.replace(/\/+$/, '')));

interface AzLinkProps extends Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> {
  href?: string | null;
  children?: ReactNode;
}

/**
 * A merchant-entered link: the router's `Link` inside the store, a new tab
 * outside it, and a plain anchor for `#`, `tel:` and `mailto:`.
 */
export function AzLink({ href, children, ...rest }: AzLinkProps) {
  const { store } = useTwilight();
  const url = href || '#';
  if (isExternalUrl(url, store?.url)) {
    return (
      <a href={url} target="_blank" rel="noopener" {...rest}>
        {children}
      </a>
    );
  }
  if (url.startsWith('#') || /^(tel|mailto|sms|whatsapp):/i.test(url)) {
    return (
      <a href={url} {...rest}>
        {children}
      </a>
    );
  }
  return (
    <Link to={url} {...rest}>
      {children}
    </Link>
  );
}
