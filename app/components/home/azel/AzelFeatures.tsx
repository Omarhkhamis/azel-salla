import { memo } from 'react';
import { Image } from '@salla.sa/twilight-theme-engine/common';
import { useMoney } from '@salla.sa/twilight-theme-engine/hooks/useMoney';
import { AzLink } from '../../azel/AzLink';
import { Reveal } from '../../azel/Reveal';
import { SectionHead } from '../../azel/SectionHead';
import { collection, linkUrl } from '../../../lib/azel/utils';
import type { BlockProps } from './types';

interface FeatureCard {
  image?: string;
  badge?: string;
  chip?: string;
  title?: string;
  text?: string;
  spec1_value?: string;
  spec1_label?: string;
  spec2_value?: string;
  spec2_label?: string;
  spec3_value?: string;
  spec3_label?: string;
  price?: number | string;
  unit?: string;
  btn_text?: string;
  url?: unknown;
}

function Spec({ value, label }: { value?: string; label?: string }) {
  if (!value) return null;
  return (
    <div className="spec">
      <b>{value}</b>
      <span>{label}</span>
    </div>
  );
}

/** `home.azel-features`: the two big product cards. */
export const AzelFeatures = memo(function AzelFeatures({
  data,
}: BlockProps<{
  eyebrow?: string;
  title?: string;
  link_text?: string;
  link_url?: unknown;
  cards?: unknown;
}>) {
  const { format } = useMoney();
  const cards = collection<FeatureCard>(data.cards, 'cards');
  return (
    <section className="section az">
      <div className="container">
        {(data.eyebrow || data.title || data.link_text) && (
          <SectionHead
            eyebrow={data.eyebrow}
            title={data.title}
            linkText={data.link_text}
            linkHref={data.link_url}
          />
        )}
        <div className="feature-grid">
          {cards.map((card, i) => {
            const url = linkUrl(card.url);
            return (
              <Reveal as="article" key={i} className="feature-card">
                {card.badge && <span className="badge">{card.badge}</span>}
                <AzLink href={url} className="feature-media">
                  {card.image && (
                    <Image
                      src={card.image}
                      alt={card.title ?? ''}
                      srcSetWidths={[480, 720, 960]}
                      sizes="(max-width: 960px) 100vw, 600px"
                    />
                  )}
                </AzLink>
                <div className="feature-body">
                  <div>
                    {card.chip && <span className="chip">{card.chip}</span>}
                    {card.title && (
                      <h3>
                        <AzLink href={url}>{card.title}</AzLink>
                      </h3>
                    )}
                  </div>
                  {card.text && <p className="lead">{card.text}</p>}
                  {(card.spec1_value || card.spec2_value || card.spec3_value) && (
                    <div className="spec-list">
                      <Spec value={card.spec1_value} label={card.spec1_label} />
                      <Spec value={card.spec2_value} label={card.spec2_label} />
                      <Spec value={card.spec3_value} label={card.spec3_label} />
                    </div>
                  )}
                  <div className="feature-foot">
                    {!!card.price && (
                      <span className="price">
                        {format(card.price)}
                        {card.unit && (
                          <>
                            {' '}
                            <small>{card.unit}</small>
                          </>
                        )}
                      </span>
                    )}
                    {card.btn_text && (
                      <AzLink href={url} className="btn">
                        {card.btn_text}
                      </AzLink>
                    )}
                  </div>
                </div>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
});
