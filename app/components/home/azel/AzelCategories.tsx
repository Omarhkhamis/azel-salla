import { memo } from 'react';
import { AzLink } from '../../azel/AzLink';
import { Icon } from '../../azel/Icon';
import { SectionHead } from '../../azel/SectionHead';
import { collection, linkUrl } from '../../../lib/azel/utils';
import type { BlockProps } from './types';

/** `home.azel-categories`: image tiles with a round arrow. */
export const AzelCategories = memo(function AzelCategories({
  data,
}: BlockProps<{
  eyebrow?: string;
  title?: string;
  subtitle?: string;
  link_text?: string;
  link_url?: unknown;
  tiles?: unknown;
}>) {
  const tiles = collection<{ image?: string; name?: string; sub?: string; url?: unknown }>(
    data.tiles,
    'tiles'
  );
  if (!tiles.length) return null;
  return (
    <section className="section bg-white-az az">
      <div className="container">
        <SectionHead
          eyebrow={data.eyebrow}
          title={data.title}
          subtitle={data.subtitle}
          linkText={data.link_text}
          linkHref={data.link_url}
        />
        <div className="cat-tiles">
          {tiles.map((tile, i) => (
            <AzLink key={i} href={linkUrl(tile.url)} className="cat-tile">
              <span className="ct-img">{tile.image && <img src={tile.image} alt="" loading="lazy" />}</span>
              <span className="ct-body">
                <b>{tile.name}</b>
                {tile.sub && <small>{tile.sub}</small>}
              </span>
              <span className="ct-go">
                <Icon name="arrowL" className="i-sm i-flip" />
              </span>
            </AzLink>
          ))}
        </div>
      </div>
    </section>
  );
});
