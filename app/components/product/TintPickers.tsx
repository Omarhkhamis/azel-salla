import { useCallback, useEffect, useMemo, useRef, useState, type RefObject } from 'react';
import { useTranslation } from '@salla.sa/twilight-theme-engine/i18n';
import { useGrades, useSettings } from '../azel/useAzel';
import { gradeFor, zoneKey, type Grade, type ZoneKey } from '../../lib/azel/tint';

interface GradeDetail {
  value: string;
  disabled: boolean;
  grade: Grade;
}

interface GradeOption {
  id: string;
  name: string;
  required: boolean;
  zone: ZoneKey | null;
  details: GradeDetail[];
}

const OPTION_BOX = '.s-product-options-option-container';

/**
 * Salla's rendered options whose every value is a tint grade. The markup belongs
 * to `<salla-product-options>`: there is no prop or event that exposes it, so it
 * is read here, and its real inputs stay the source of truth.
 */
function readGradeOptions(root: Element, grades: Grade[]): { option: GradeOption; box: HTMLElement }[] {
  const found: { option: GradeOption; box: HTMLElement }[] = [];
  root.querySelectorAll<HTMLElement>(OPTION_BOX).forEach((box) => {
    if (box.classList.contains('hidden')) return;
    const inputs = Array.from(
      box.querySelectorAll<HTMLInputElement>('.s-product-options-grid-mode input[type=radio]')
    );
    if (inputs.length < 2) return;
    const details: GradeDetail[] = [];
    for (const input of inputs) {
      const grade = gradeFor((input.nextElementSibling?.textContent ?? '').trim(), grades);
      if (!grade) return;
      details.push({ value: input.value, disabled: input.disabled, grade });
    }
    const label = box.querySelector('.s-product-options-option-label b');
    const name = (label?.firstChild?.textContent || label?.textContent || '').replace('*', '').trim();
    found.push({
      box,
      option: {
        id: box.dataset.optionId ?? '',
        name,
        required:
          box.querySelector<HTMLElement>('.s-product-options-option')?.dataset.optionRequired ===
          'true',
        zone: zoneKey(name, found.length),
        details,
      },
    });
  });
  return found;
}

const optionInputs = (root: Element, id: string) =>
  root.querySelectorAll<HTMLInputElement>(`${OPTION_BOX}[data-option-id="${id}"] input[type=radio]`);

/** Clicks Salla's own input so its handlers run (price, conditions, validation). */
function pickInput(root: Element, id: string, value: string) {
  const input = Array.from(optionInputs(root, id)).find((el) => el.value === value);
  if (input && !input.checked && !input.disabled) input.click();
}

function CarDiagram({
  options,
  picked,
  highlight,
  onHover,
  onZoneClick,
  frontLabel,
}: {
  options: GradeOption[];
  picked: (option: GradeOption) => GradeDetail | undefined;
  highlight: ZoneKey | null;
  onHover: (zone: ZoneKey | null) => void;
  onZoneClick: (zone: ZoneKey) => void;
  frontLabel: string;
}) {
  const zone = (key: ZoneKey, paths: string[]) => {
    const option = options.find((o) => o.zone === key);
    const detail = option && picked(option);
    return (
      <g
        data-zone={key}
        className={`${detail ? 'set' : ''}${highlight === key ? ' hl' : ''}`.trim() || undefined}
        style={
          {
            display: option ? undefined : 'none',
            '--a': detail ? detail.grade.alpha : 0,
          } as React.CSSProperties
        }
        onMouseEnter={() => onHover(key)}
        onClick={() => onZoneClick(key)}
      >
        {paths.map((d) => (
          <path key={d} d={d} className="glass" />
        ))}
      </g>
    );
  };
  return (
    <div className="car-diagram" aria-hidden="true">
      <svg viewBox="0 0 200 380">
        <defs>
          <linearGradient id="glass" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#BFE3F3" />
            <stop offset="1" stopColor="#8CC4DE" />
          </linearGradient>
        </defs>
        <rect x="22" y="14" width="156" height="352" rx="62" className="body" />
        <rect x="34" y="128" width="132" height="132" rx="16" className="roof" />
        {zone('front', ['M44 120 Q100 92 156 120 L146 80 Q100 62 54 80 Z'])}
        {zone('fside', ['M30 132 L40 128 L40 192 L30 192 Z', 'M170 132 L160 128 L160 192 L170 192 Z'])}
        {zone('rside', ['M30 198 L40 198 L40 252 L30 248 Z', 'M170 198 L160 198 L160 252 L170 248 Z'])}
        {zone('rear', ['M48 268 Q100 284 152 268 L144 300 Q100 312 56 300 Z'])}
        <rect x="64" y="22" width="72" height="8" rx="4" className="light" />
      </svg>
      <span className="dlabel">{frontLabel}</span>
    </div>
  );
}

/**
 * The design's grade pickers, on top of Salla's own options, which stay in the
 * form for validation, pricing and stock. Options whose values are all tint grades
 * are mirrored and their Salla row hidden visually (`.az-mirrored`):
 *   two or more → per-zone rows with the car diagram and «نفس الدرجة للكل»
 *   exactly one → swatch cards with the grade's description
 * `?grade=NN` from the hero card preselects every grade option once. A required
 * option left empty shows the design's own error instead of a native bubble that
 * would point at a hidden input.
 */
export function TintPickers({ formRef }: { formRef: RefObject<HTMLFormElement | null> }) {
  const { t } = useTranslation();
  const get = useSettings();
  const grades = useGrades();
  const zonesRef = useRef<HTMLDivElement>(null);
  const gradeRef = useRef<HTMLDivElement>(null);
  const rowRefs = useRef(new Map<string, HTMLDivElement>());
  const [options, setOptions] = useState<GradeOption[]>([]);
  const [checked, setChecked] = useState<Record<string, string>>({});
  const [missing, setMissing] = useState<Record<string, boolean>>({});
  const [zoneError, setZoneError] = useState(false);
  const [gradeError, setGradeError] = useState(false);
  const [highlight, setHighlight] = useState<ZoneKey | null>(null);
  const [otherError, setOtherError] = useState(false);
  const signature = useRef('');
  const preselected = useRef(false);

  const root = useCallback(
    () => formRef.current?.querySelector('salla-product-options') ?? null,
    [formRef]
  );

  const sync = useCallback(() => {
    const el = root();
    if (!el || !grades.length) return;
    const read = readGradeOptions(el, grades);
    const found = read.map((r) => r.option);
    // Salla's rows are the web component's markup, out of React's reach: the
    // mirrored ones are hidden visually only, so they stay in the form.
    el.querySelectorAll('.az-mirrored').forEach((box) => {
      if (!read.some((r) => r.box === box)) box.classList.remove('az-mirrored');
    });
    read.forEach((r) => r.box.classList.add('az-mirrored'));

    const sig = found
      .map((o) => `${o.id}:${o.details.map((d) => `${d.value}${d.disabled ? '!' : ''}`).join(',')}`)
      .join('|');
    if (sig !== signature.current) {
      signature.current = sig;
      setOptions(found);
    }

    const next: Record<string, string> = {};
    found.forEach((o) => {
      const on = Array.from(optionInputs(el, o.id)).find((input) => input.checked);
      if (on) next[o.id] = on.value;
    });
    setChecked((current) =>
      JSON.stringify(current) === JSON.stringify(next) ? current : next
    );

    if (!preselected.current && found.length) {
      preselected.current = true;
      const wanted = new URLSearchParams(window.location.search).get('grade');
      if (wanted) {
        found.forEach((o) => {
          const detail = o.details.find((d) => d.grade.id === wanted);
          if (detail) pickInput(el, o.id, detail.value);
        });
      }
    }

    if (el && !el.querySelector('input:invalid, select:invalid, textarea:invalid')) setOtherError(false);
  }, [root, grades]);

  // Salla renders its options late and re-renders them on conditions and variants.
  useEffect(() => {
    const form = formRef.current;
    if (!form) return;
    let queued = false;
    const schedule = () => {
      if (queued) return;
      queued = true;
      requestAnimationFrame(() => {
        queued = false;
        sync();
      });
    };
    const observer = new MutationObserver(schedule);
    observer.observe(form, { childList: true, subtree: true });
    form.addEventListener('change', schedule);
    schedule();
    return () => {
      observer.disconnect();
      form.removeEventListener('change', schedule);
    };
  }, [formRef, sync]);

  const picked = useCallback(
    (option: GradeOption) => option.details.find((d) => d.value === checked[option.id]),
    [checked]
  );

  const zoneMode = options.length > 1;
  const single = options.length === 1 ? options[0] : null;

  useEffect(() => {
    if (zoneMode && options.every((o) => checked[o.id])) setZoneError(false);
    if (single && checked[single.id]) setGradeError(false);
    setMissing((current) => {
      const pending = Object.keys(current).filter((id) => current[id] && !checked[id]);
      return pending.length === Object.keys(current).length
        ? current
        : Object.fromEntries(pending.map((id) => [id, true]));
    });
  }, [checked, options, zoneMode, single]);

  // The browser fires `invalid` on each missing required option before the form submits.
  useEffect(() => {
    let scrolled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const scrollTo = (el: Element | null) => {
      if (scrolled || !el) return;
      scrolled = true;
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      timer = setTimeout(() => {
        scrolled = false;
      }, 400);
    };
    const onInvalid = (e: Event) => {
      const box = (e.target as Element).closest?.<HTMLElement>(OPTION_BOX);
      if (!box) return;
      if (!box.classList.contains('az-mirrored')) {
        setOtherError(true);
        return;
      }
      e.preventDefault();
      if (zonesRef.current && !zonesRef.current.hidden) {
        const id = box.dataset.optionId ?? '';
        setMissing((current) => ({ ...current, [id]: true }));
        setZoneError(true);
        scrollTo(zonesRef.current);
      } else {
        setGradeError(true);
        scrollTo(gradeRef.current);
      }
    };
    document.addEventListener('invalid', onInvalid, true);
    return () => {
      document.removeEventListener('invalid', onInvalid, true);
      clearTimeout(timer);
    };
  }, []);

  const choose = (id: string, value: string) => {
    const el = root();
    if (el) pickInput(el, id, value);
  };

  const commonGrades = useMemo(
    () => grades.filter((g) => options.every((o) => o.details.some((d) => d.grade.id === g.id))),
    [grades, options]
  );

  const allSame = (gradeId: string) =>
    options.every((o) => picked(o)?.grade.id === gradeId);

  const pickAll = (gradeId: string) => {
    options.forEach((o) => {
      const detail = o.details.find((d) => d.grade.id === gradeId);
      if (detail) choose(o.id, detail.value);
    });
  };

  const singlePick = single ? picked(single) : undefined;
  const pickedLabel = t('azel.product.picked_zone');
  const zonesTitle = get<string>('zones_title') || t('azel.product.zones_title');
  const zonesHint = get<string>('zones_hint') || t('azel.product.zones_hint');

  return (
    <>
      <div
        ref={zonesRef}
        className="opt"
        id="opt-zones"
        hidden={!zoneMode}
        onMouseLeave={() => setHighlight(null)}
      >
        <div className="opt-label">
          {zonesTitle} <span>{zonesHint}</span>
        </div>
        <div className="zones">
          <CarDiagram
            options={options}
            picked={picked}
            highlight={highlight}
            onHover={setHighlight}
            onZoneClick={(zone) => {
              setHighlight(zone);
              rowRefs.current.get(zone)?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
            }}
            frontLabel={t('azel.product.front')}
          />
          <div className="zone-rows" id="zone-rows">
            {options.map((o) => {
              const detail = picked(o);
              const cls = [
                'zone-row',
                detail ? 'done' : '',
                missing[o.id] ? 'missing' : '',
                highlight && o.zone === highlight ? 'hl' : '',
              ]
                .filter(Boolean)
                .join(' ');
              return (
                <div
                  key={o.id}
                  className={cls}
                  ref={(el) => {
                    if (o.zone) {
                      if (el) rowRefs.current.set(o.zone, el);
                      else rowRefs.current.delete(o.zone);
                    }
                  }}
                  onMouseEnter={() => setHighlight(o.zone)}
                >
                  <div className="zone-name">
                    {o.name}
                    {o.required && (
                      <>
                        {' '}
                        <i>*</i>
                      </>
                    )}
                    <small>
                      {detail
                        ? pickedLabel
                            .replace(':name', detail.grade.name)
                            .replace(':heat', String(detail.grade.heat))
                        : t('azel.product.unpicked')}
                    </small>
                  </div>
                  <div className="zone-opts">
                    {o.details.map((d) => (
                      <button
                        key={d.value}
                        type="button"
                        className={`zone-btn${detail?.value === d.value ? ' active' : ''}`}
                        disabled={d.disabled}
                        onClick={() => choose(o.id, d.value)}
                      >
                        <b>{d.grade.label}</b>
                        <span>{d.grade.short || d.grade.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        <div className="zone-all" id="zone-all" hidden={commonGrades.length < 2}>
          <span>{t('azel.product.same_for_all')}</span>
          {commonGrades.map((g) => (
            <button
              key={g.id}
              type="button"
              className={allSame(g.id) ? 'active' : undefined}
              onClick={() => pickAll(g.id)}
            >
              {g.label}
            </button>
          ))}
        </div>
        <p className="zone-err" id="zone-err" hidden={!zoneError}>
          {t('azel.product.zones_error')}
        </p>
      </div>

      <div ref={gradeRef} className="opt light" id="opt-grade" hidden={!single}>
        <div className="opt-label">
          <span className="ol-t">{single?.name}</span>{' '}
          <span>
            {t('azel.product.selected')}: <b>{singlePick?.grade.label ?? '—'}</b> —{' '}
            <span>{singlePick?.grade.name ?? '—'}</span>
          </span>
        </div>
        <p className="muted grade-desc">{singlePick?.grade.desc ?? '—'}</p>
        <div className="grades">
          {single?.details.map((d) => (
            <button
              key={d.value}
              type="button"
              className={`grade${singlePick?.value === d.value ? ' active' : ''}`}
              style={{ '--a': d.grade.alpha } as React.CSSProperties}
              disabled={d.disabled}
              onClick={() => choose(single.id, d.value)}
            >
              <div className="sw" />
              <b>{d.grade.label}</b>
              <span>{d.grade.name}</span>
            </button>
          ))}
        </div>
        <p className="zone-err" id="grade-err" hidden={!gradeError}>
          {t('azel.product.options_error')}
        </p>
      </div>

      {/* The error for every option the pickers do not mirror; rendered after them,
          right where Salla's options sit in the form. */}
      <OtherOptionsError show={otherError} />
    </>
  );
}

function OtherOptionsError({ show }: { show: boolean }) {
  const { t } = useTranslation();
  return (
    <p className="zone-err" id="opt-err" hidden={!show}>
      {t('azel.product.options_error')}
    </p>
  );
}
