import { stripUnsafeHtml } from '@salla.sa/twilight-theme-engine/utils';

/** A token made only of letters, digits, `_` and `-`: safe inside a quoted attribute. */
const SAFE_TOKEN = /^[\w-]{1,80}$/;
const INPUT = /<input\b[^>]*>/gi;
const ATTR = /([\w-]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+)))?/g;

/**
 * Rebuilds a radio or checkbox from its safe attributes only (`type`, `id`, `name`,
 * `class`, `value`, `checked`), or returns null for any other input.
 */
function safeToggle(tag: string): string | null {
  const attrs = new Map<string, string | true>();
  for (const [, name, dq, sq, bare] of tag.slice(6, -1).matchAll(ATTR)) {
    attrs.set(name.toLowerCase(), dq ?? sq ?? bare ?? true);
  }
  const type = String(attrs.get('type') ?? '').toLowerCase();
  if (type !== 'radio' && type !== 'checkbox') return null;

  const parts = [`type="${type}"`];
  for (const name of ['id', 'name', 'value']) {
    const value = attrs.get(name);
    if (typeof value === 'string' && SAFE_TOKEN.test(value)) parts.push(`${name}="${value}"`);
  }
  const classes = attrs.get('class');
  if (typeof classes === 'string') {
    const safe = classes.split(/\s+/).filter((c) => SAFE_TOKEN.test(c));
    if (safe.length) parts.push(`class="${safe.join(' ')}"`);
  }
  if (attrs.has('checked')) parts.push('checked');
  return `<input ${parts.join(' ')}>`;
}

/**
 * The engine's `stripUnsafeHtml`, keeping the radio and checkbox toggles merchant
 * pages build pure-CSS tabs with (`#tab:checked ~ .panel`), such as the city tabs
 * on the install-centers page. The engine drops every `<input>`, which leaves those
 * pages with no tab ever checked and every panel hidden. Each toggle is rebuilt
 * from safe attributes only; every other input still goes.
 */
export function stripUnsafeHtmlKeepToggles(html: string): string {
  const toggles: string[] = [];
  const marked = html.replace(INPUT, (tag) => {
    const safe = safeToggle(tag);
    if (!safe) return tag;
    toggles.push(safe);
    return `<!--azel-toggle-${toggles.length - 1}-->`;
  });
  return stripUnsafeHtml(marked).replace(/<!--azel-toggle-(\d+)-->/g, (_, i) => toggles[Number(i)] ?? '');
}
