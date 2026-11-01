import { memo, useState } from 'react';
import { AzLink } from '../../azel/AzLink';
import { Icon } from '../../azel/Icon';
import { collection, pick } from '../../../lib/azel/utils';
import type { BlockProps } from './types';

interface TrustItem {
  icon?: unknown;
  title?: string;
  sub?: string;
  more?: string;
  link_text?: string;
  link_url?: string;
}

/** `home.azel-trust`: four items, details on hover (CSS) and on tap or keyboard. */
export const AzelTrust = memo(function AzelTrust({ data }: BlockProps<{ items?: unknown }>) {
  const items = collection<TrustItem>(data.items, 'items');
  const [open, setOpen] = useState<number | null>(null);
  if (!items.length) return null;
  const toggle = (index: number) => setOpen((current) => (current === index ? null : index));
  return (
    <section className="trust az">
      <div className="container trust-grid">
        {items.map((item, i) => (
          <div
            key={i}
            className={`trust-item${open === i ? ' open' : ''}`}
            role="button"
            tabIndex={0}
            aria-expanded={open === i}
            style={{ '--d': `${i * 90}ms` } as React.CSSProperties}
            onClick={(e) => {
              if (!(e.target as Element).closest('a')) toggle(i);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                toggle(i);
              }
            }}
          >
            <span className="ico">
              <Icon name={pick(item.icon) || 'award'} />
            </span>
            <div className="ti-text">
              <b>{item.title}</b>
              <span className="ti-swap">
                <span className="ti-sub">{item.sub}</span>
                {(item.more || item.link_text) && (
                  <span className="ti-more">
                    {item.more}
                    {item.link_text && (
                      <>
                        {' — '}
                        <AzLink href={item.link_url}>{item.link_text}</AzLink>
                      </>
                    )}
                  </span>
                )}
              </span>
            </div>
            <span className="ti-plus" aria-hidden="true" />
          </div>
        ))}
      </div>
    </section>
  );
});
