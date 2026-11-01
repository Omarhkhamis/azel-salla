/**
 * Tint grades (درجات التظليل): theme settings, three fixed grades as in the design.
 * One source for the hero's grade card and the product page's zone / grade pickers.
 */

export interface Grade {
  id: string;
  label: string;
  name: string;
  short: string;
  desc: string;
  /** 0–1, how dark the swatch and the car diagram's glass read. */
  alpha: number;
  heat: number;
  uv: number;
  privacy: number;
}

type Settings = Record<string, unknown> | undefined;

const read = (settings: Settings, id: string, fallback: unknown) => {
  const value = settings?.[id];
  return value === undefined || value === null ? fallback : value;
};

/** Written out per grade: every setting name appears literally for Salla's review tools. */
export function gradesFromSettings(s: Settings): Grade[] {
  const raw = [
    {
      id: read(s, 'grade1_code', '00'),
      name: read(s, 'grade1_name', 'خفيف العتمة'),
      short: read(s, 'grade1_short', 'خفيف · مطابق للمرور'),
      desc: read(
        s,
        'grade1_desc',
        'تظليل خفيف مع رؤية واضحة وراحة أكبر أثناء القيادة — مطابق لأنظمة المرور'
      ),
      shade: read(s, 'grade1_shade', 28),
      heat: read(s, 'grade1_heat', 65),
      uv: read(s, 'grade1_uv', 99),
      privacy: read(s, 'grade1_privacy', 35),
    },
    {
      id: read(s, 'grade2_code', '01'),
      name: read(s, 'grade2_name', 'متوسط العتمة'),
      short: read(s, 'grade2_short', 'متوسط العتمة'),
      desc: read(s, 'grade2_desc', 'تظليل متوسط يجمع بين الخصوصية والرؤية المريحة'),
      shade: read(s, 'grade2_shade', 55),
      heat: read(s, 'grade2_heat', 76),
      uv: read(s, 'grade2_uv', 99),
      privacy: read(s, 'grade2_privacy', 65),
    },
    {
      id: read(s, 'grade3_code', '02'),
      name: read(s, 'grade3_name', 'تعتيم كامل'),
      short: read(s, 'grade3_short', 'تعتيم كامل'),
      desc: read(s, 'grade3_desc', 'تظليل داكن يوفر أعلى مستوى من الخصوصية وتقليل الوهج'),
      shade: read(s, 'grade3_shade', 82),
      heat: read(s, 'grade3_heat', 94),
      uv: read(s, 'grade3_uv', 99),
      privacy: read(s, 'grade3_privacy', 100),
    },
  ];
  // a grade with no code is unused
  return raw
    .filter((g) => String(g.id ?? '').trim())
    .map((g) => {
      const id = String(g.id).trim();
      return {
        id,
        label: id,
        name: String(g.name ?? ''),
        short: String(g.short ?? ''),
        desc: String(g.desc ?? ''),
        alpha: Math.min(1, Math.max(0, (Number(g.shade) || 0) / 100)),
        heat: Number(g.heat) || 0,
        uv: Number(g.uv) || 0,
        privacy: Number(g.privacy) || 0,
      };
    });
}

const escapeRegExp = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** The grade whose code matches a piece of text — «01», «درجة 01», «01 متوسط». */
export function gradeFor(text: unknown, list: Grade[]): Grade | null {
  const t = String(text ?? '').trim();
  if (!t) return null;
  return (
    list.find((g) => t === g.id) ||
    list.find((g) => new RegExp(`(^|[^0-9])${escapeRegExp(g.id)}([^0-9]|$)`).test(t)) ||
    null
  );
}

export const ZONE_KEYS = ['front', 'fside', 'rside', 'rear'] as const;
export type ZoneKey = (typeof ZONE_KEYS)[number];

/** Which glass of the diagram an option is, from its name — or its order. */
export function zoneKey(name: unknown, index: number): ZoneKey | null {
  const n = String(name ?? '');
  const side = /جانب|جوانب|side/i.test(n);
  const front = /أمام|امام|front/i.test(n);
  const rear = /خلف|rear|back/i.test(n);
  if (side && front) return 'fside';
  if (side && rear) return 'rside';
  if (front) return 'front';
  if (rear) return 'rear';
  return ZONE_KEYS[index] ?? null;
}

/** The card's link with the picked grade: the product page preselects it from `?grade=`. */
export function withGrade(url: string, id: string, base: string): string {
  if (!url || url === '#') return url;
  try {
    const u = new URL(url, base);
    u.searchParams.set('grade', id);
    return u.toString();
  } catch {
    return url;
  }
}
