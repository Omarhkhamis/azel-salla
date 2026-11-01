import { memo, useMemo, useState } from 'react';
import { useTranslation } from '@salla.sa/twilight-theme-engine/i18n';
import { useTwilight } from '@salla.sa/twilight-theme-engine/providers';
import { AzLink } from '../../azel/AzLink';
import { useGrades } from '../../azel/useAzel';
import { collection, linkUrl } from '../../../lib/azel/utils';
import { withGrade, type Grade } from '../../../lib/azel/tint';
import type { BlockProps } from './types';

interface HeroData {
  eyebrow?: string;
  title_start?: string;
  highlight?: string;
  title_end?: string;
  lead_start?: string;
  lead_strong?: string;
  lead_end?: string;
  btn1_text?: string;
  btn1_url?: unknown;
  btn2_text?: string;
  btn2_url?: unknown;
  stats?: unknown;
  tint_enabled?: boolean;
  tint_eyebrow?: string;
  tint_title?: string;
  tint_text?: string;
  tint_default?: string;
  meter_heat?: string;
  meter_uv?: string;
  meter_privacy?: string;
  tint_btn_text?: string;
  tint_btn_url?: unknown;
  image?: string;
}

function Meter({ label, value }: { label: string; value: number }) {
  return (
    <div className="meter">
      <span>{label}</span>
      <b className="num">{value}%</b>
      <div className="bar">
        <i style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

/** The grade explorer. Its button carries `?grade=NN`, which the product page preselects. */
function TintCard({ data, grades }: { data: HeroData; grades: Grade[] }) {
  const { t } = useTranslation();
  const { store } = useTwilight();
  const initial = String(data.tint_default ?? '01').trim();
  const [selected, setSelected] = useState(initial);
  const grade = grades.find((g) => g.id === selected) ?? grades[Math.min(1, grades.length - 1)];
  const cta = linkUrl(data.tint_btn_url);
  const href = useMemo(
    () => (cta ? withGrade(cta, grade.id, store?.url || 'https://store.invalid/') : '#'),
    [cta, grade.id, store?.url]
  );
  return (
    <div className="hero-tint">
      {data.tint_eyebrow && <span className="eyebrow">{data.tint_eyebrow}</span>}
      {data.tint_title && <h2>{data.tint_title}</h2>}
      {data.tint_text && <p className="ht-sub">{data.tint_text}</p>}
      <div className="grades">
        {grades.map((g) => (
          <button
            key={g.id}
            type="button"
            className={`grade${g.id === grade.id ? ' active' : ''}`}
            style={{ '--a': g.alpha } as React.CSSProperties}
            onClick={() => setSelected(g.id)}
          >
            <div className="sw" />
            <b>{g.label}</b>
            <span>{g.name}</span>
          </button>
        ))}
      </div>
      <p className="ht-desc">
        <b>{grade.name}</b> — <span>{grade.desc}</span>
      </p>
      <div className="tint-stats">
        <Meter label={data.meter_heat || t('azel.tint.heat')} value={grade.heat} />
        <Meter label={data.meter_uv || t('azel.tint.uv')} value={grade.uv} />
        <Meter label={data.meter_privacy || t('azel.tint.privacy')} value={grade.privacy} />
      </div>
      {data.tint_btn_text && (
        <AzLink href={href} className="btn btn-lime btn-lg btn-block">
          {data.tint_btn_text}
        </AzLink>
      )}
    </div>
  );
}

/** `home.azel-hero`: the headline and the tint-grade card (or an image instead of it). */
export const AzelHero = memo(function AzelHero({ data }: BlockProps<HeroData>) {
  const grades = useGrades();
  const stats = collection<{ value?: string; label?: string }>(data.stats, 'stats');
  const showTint = data.tint_enabled !== false;
  const hasTitle = data.title_start || data.highlight || data.title_end;
  const hasLead = data.lead_start || data.lead_strong || data.lead_end;
  return (
    <section className="hero on-dark az">
      <div className="container hero-inner">
        <div>
          {data.eyebrow && <span className="eyebrow">{data.eyebrow}</span>}
          {hasTitle && (
            <h1>
              {data.title_start}
              {data.highlight && (
                <>
                  {' '}
                  <em>{data.highlight}</em>
                </>
              )}
              {data.title_end && ` ${data.title_end}`}
            </h1>
          )}
          {hasLead && (
            <p className="hero-lead">
              {data.lead_start}
              {data.lead_strong && (
                <>
                  {' '}
                  <strong>{data.lead_strong}</strong>
                </>
              )}
              {data.lead_end && ` ${data.lead_end}`}
            </p>
          )}
          {(data.btn1_text || data.btn2_text) && (
            <div className="hero-cta">
              {data.btn1_text && (
                <AzLink href={linkUrl(data.btn1_url)} className="btn btn-lime btn-lg">
                  {data.btn1_text}
                </AzLink>
              )}
              {data.btn2_text && (
                <AzLink href={linkUrl(data.btn2_url)} className="btn btn-ghost-light btn-lg">
                  {data.btn2_text}
                </AzLink>
              )}
            </div>
          )}
          {stats.length > 0 && (
            <div className="hero-stats">
              {stats
                .filter((s) => s.value || s.label)
                .map((s, i) => (
                  <div key={i}>
                    <b className="num">{s.value}</b>
                    <span>{s.label}</span>
                  </div>
                ))}
            </div>
          )}
        </div>

        <div className="hero-visual">
          {showTint ? (
            grades.length > 0 && <TintCard data={data} grades={grades} />
          ) : data.image ? (
            <div className="hero-frame">
              <img
                src={data.image}
                alt={`${data.title_start ?? ''} ${data.highlight ?? ''}`.trim()}
                fetchPriority="high"
              />
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
});
