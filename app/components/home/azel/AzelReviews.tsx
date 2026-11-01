import { memo } from 'react';
import { Icon, Stars } from '../../azel/Icon';
import { Reveal } from '../../azel/Reveal';
import { collection } from '../../../lib/azel/utils';
import type { BlockProps } from './types';

/** `home.azel-reviews`: quote cards and the rating summary. */
export const AzelReviews = memo(function AzelReviews({
  data,
}: BlockProps<{
  eyebrow?: string;
  title?: string;
  rating?: string;
  rating_note?: string;
  verified_label?: string;
  reviews?: unknown;
}>) {
  const rating = String(data.rating ?? '').trim();
  const reviews = collection<{ text?: string; name?: string; city?: string }>(
    data.reviews,
    'reviews'
  ).filter((review) => review.text);
  return (
    <section className="section az">
      <div className="container">
        <div className="section-head">
          <div>
            {data.eyebrow && <span className="eyebrow">{data.eyebrow}</span>}
            {data.title && <h2 className="section-title">{data.title}</h2>}
          </div>
          {rating && (
            <div className="rating-summary">
              <span className="big num">{rating}</span>
              <div>
                <Stars rating={5} />
                {data.rating_note && <div className="muted rs-note">{data.rating_note}</div>}
              </div>
            </div>
          )}
        </div>
        <div className="reviews">
          {reviews.map((review, i) => (
            <Reveal as="figure" key={i} className="review">
              <q>{review.text}</q>
              <figcaption className="reviewer">
                <span className="avatar">{Array.from((review.name ?? '').trim())[0] ?? ''}</span>
                <div>
                  <b>{review.name}</b>
                  {review.city && <span>{review.city}</span>}
                </div>
                {data.verified_label && (
                  <span className="verified">
                    <Icon name="check" className="i-xs" /> {data.verified_label}
                  </span>
                )}
              </figcaption>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
});
