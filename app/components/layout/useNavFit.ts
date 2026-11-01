import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';

const isoLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect;

type Phase = 'wide' | 'tight' | 'done';

interface FitState {
  phase: Phase;
  tight: boolean;
  /** How many of the nav's items stay on the bar. */
  count: number;
}

const MEASURE: FitState = { phase: 'wide', tight: false, count: Number.POSITIVE_INFINITY };

/** How many items fit once room is kept for the «المزيد» item, dropping from the end. */
export function fitItems(widths: number[], room: number, gap: number, moreWidth: number): number {
  const used = (count: number, withMore: boolean) => {
    const parts = widths.slice(0, count);
    if (withMore) parts.push(moreWidth);
    return parts.reduce((sum, width) => sum + width, 0) + gap * Math.max(0, parts.length - 1);
  };
  let count = widths.length;
  while (count > 0 && used(count, count < widths.length) > room) count -= 1;
  return count;
}

/**
 * «المزيد»: a merchant's menu can be wider than the bar. Instead of letting the
 * links run over the icons, the bar first tightens, then the links that do not
 * fit (from the end) move into a «المزيد» dropdown. Re-measured whenever the bar
 * can change width: menu loaded, fonts, logo, resize. Each measurement renders
 * every link before paint and settles in the same frame, so nothing flickers.
 */
export function useNavFit(itemCount: number) {
  const navRef = useRef<HTMLElement>(null);
  const [fit, setFit] = useState<FitState>(MEASURE);
  // A fresh object each time, so a re-measure never bails out as "no change".
  const remeasure = useCallback(() => setFit({ ...MEASURE }), []);

  // The menu arriving re-measures too: an update made while the page hydrates can be dropped.
  const measuredCount = useRef(-1);
  isoLayoutEffect(() => {
    if (fit.phase === 'done' && measuredCount.current === itemCount) return;
    if (fit.phase === 'done') {
      remeasure();
      return;
    }
    measuredCount.current = itemCount;

    const nav = navRef.current;
    const inner = nav?.parentElement;
    const actions = inner?.querySelector<HTMLElement>('.header-actions');
    if (!nav || !inner || !actions) return;
    if (getComputedStyle(nav).display === 'none') {
      setFit({ phase: 'done', tight: false, count: Number.POSITIVE_INFINITY });
      return;
    }

    const logo = inner.querySelector<HTMLElement>('.logo');
    const toggle = inner.querySelector<HTMLElement>('.menu-toggle');
    const cs = getComputedStyle(inner);
    const gap = parseFloat(cs.columnGap) || 0;
    const room =
      inner.clientWidth -
      parseFloat(cs.paddingLeft) -
      parseFloat(cs.paddingRight) -
      (logo?.offsetWidth ?? 0) -
      (toggle?.offsetWidth ?? 0) -
      actions.offsetWidth -
      gap * 2;
    const navGap = parseFloat(getComputedStyle(nav).columnGap) || 0;
    const children = Array.from(nav.children) as HTMLElement[];
    const more = children.find((el) => el.classList.contains('nav-more'));
    const widths = children.filter((el) => el !== more).map((el) => el.offsetWidth);
    const total = widths.reduce((sum, w) => sum + w, 0) + navGap * Math.max(0, widths.length - 1);

    if (total <= room) {
      setFit({ phase: 'done', tight: fit.tight, count: widths.length });
    } else if (fit.phase === 'wide') {
      // first the bar tightens (less padding, no gap), then links overflow
      setFit({ phase: 'tight', tight: true, count: Number.POSITIVE_INFINITY });
    } else {
      setFit({
        phase: 'done',
        tight: true,
        count: fitItems(widths, room, navGap, more?.offsetWidth ?? 0),
      });
    }
  }, [fit, itemCount, remeasure]);

  // Anything that changes the room the links have: the bar's width (resize, the
  // stylesheet arriving), the logo loading, the account and cart widgets filling in.
  useEffect(() => {
    const inner = navRef.current?.parentElement;
    if (!inner) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const sizes = new WeakMap<Element, number>();
    const observer = new ResizeObserver((entries) => {
      const changed = entries.some((entry) => {
        const width = Math.round(entry.contentRect.width);
        const before = sizes.get(entry.target);
        sizes.set(entry.target, width);
        return before !== undefined && before !== width;
      });
      if (!changed) return;
      clearTimeout(timer);
      timer = setTimeout(remeasure, 60);
    });
    [inner, inner.querySelector('.logo'), inner.querySelector('.header-actions')].forEach(
      (el) => el && observer.observe(el)
    );
    let alive = true;
    void document.fonts?.ready.then(() => {
      if (alive) remeasure();
    });
    return () => {
      alive = false;
      clearTimeout(timer);
      observer.disconnect();
    };
  }, [remeasure]);

  return { navRef, tight: fit.tight, count: fit.count, measuring: fit.phase !== 'done' };
}
