import { memo } from 'react';
import { Image } from '@salla.sa/twilight-theme-engine/common';
import { AzLink } from '../../azel/AzLink';
import { Reveal } from '../../azel/Reveal';
import { collection, linkUrl } from '../../../lib/azel/utils';
import type { BlockProps } from './types';

/** `home.azel-gift`: the bundle offer band with the gifts beside the text. */
export const AzelGift = memo(function AzelGift({
  data,
}: BlockProps<{
  eyebrow?: string;
  title?: string;
  text?: string;
  btn_text?: string;
  btn_url?: unknown;
  items?: unknown;
}>) {
  const items = collection<{ image?: string; name?: string; url?: unknown }>(data.items, 'items');
  return (
    <section className="section-sm az azel-gift-sec">
      <div className="container">
        <Reveal className="gift-banner">
          <div className="gb-text">
            {data.eyebrow && <span className="eyebrow">{data.eyebrow}</span>}
            {data.title && <h2>{data.title}</h2>}
            {data.text && <p>{data.text}</p>}
            {data.btn_text && (
              <AzLink href={linkUrl(data.btn_url)} className="btn btn-lime btn-lg">
                {data.btn_text}
              </AzLink>
            )}
          </div>
          {items.length > 0 && (
            <div className="gb-items">
              {items.map((gift, i) => (
                <AzLink key={i} href={linkUrl(gift.url)} className="gb-item">
                  <span>{gift.image && <Image src={gift.image} alt="" srcSetWidths={[160, 240]} sizes="120px" />}</span>
                  <b>{gift.name}</b>
                </AzLink>
              ))}
            </div>
          )}
        </Reveal>
      </div>
    </section>
  );
});
