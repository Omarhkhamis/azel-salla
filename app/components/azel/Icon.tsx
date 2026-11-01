import { ICONS } from '../../lib/azel/icons';

/** One of the design's line icons. The markup is a theme-owned constant, never merchant data. */
export function Icon({ name, className = '' }: { name: string; className?: string }) {
  return (
    <svg
      className={`i ${className}`.trim()}
      viewBox="0 0 24 24"
      aria-hidden="true"
      dangerouslySetInnerHTML={{ __html: ICONS[name] ?? '' }}
    />
  );
}

/** Five filled/off stars for a 0–5 rating. */
export function Stars({ rating }: { rating: unknown }) {
  const r = Math.round(Number(rating) || 0);
  return (
    <span className="stars">
      {[1, 2, 3, 4, 5].map((n) => (
        <Icon key={n} name="star" className={n <= r ? '' : 'off'} />
      ))}
    </span>
  );
}
