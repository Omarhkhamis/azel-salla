/**
 * AZEL — tint grades (درجات التظليل).
 * ---------------------------------------------------------------------------
 * The grades are theme settings, serialised by master.twig into
 * <html data-grades>. This module reads them once and drives the design's
 * grade explorer (initTint in Azel+/assets/js/main.js): the swatch buttons,
 * the name / description lines and the three meters.
 *
 * Markup contract (as in the design):
 *   [data-tint data-default="01"]   the root; fires a `grade` event on change
 *     .grades                       filled with one .grade button per grade
 *     [data-t="name|desc|label|heat|uv|privacy"]   text slots
 *     [data-bar="heat|uv|privacy"]  meter bars (width = value %)
 */

let cache = null;

export function grades() {
    if (cache) return cache;
    try { cache = JSON.parse(document.documentElement.dataset.grades || '[]'); } catch (e) { cache = []; }
    // master.twig sends `shade` as a 0–100 setting; a grade with no code is unused
    cache = cache.filter((g) => g && String(g.id ?? '').trim()).map((g) => ({
        ...g,
        id: String(g.id).trim(),
        label: String(g.label ?? g.id).trim(),
        alpha: Math.min(1, Math.max(0, g.alpha !== undefined ? Number(g.alpha) || 0 : (Number(g.shade) || 0) / 100)),
        heat: Number(g.heat) || 0,
        uv: Number(g.uv) || 0,
        privacy: Number(g.privacy) || 0,
    }));
    return cache;
}

/** The grade whose code matches a piece of text — «01», «درجة 01», «01 متوسط». */
export function gradeFor(text) {
    const t = String(text || '').trim();
    if (!t) return null;
    const list = grades();
    return list.find((g) => t === g.id)
        || list.find((g) => new RegExp(`(^|[^0-9])${g.id}([^0-9]|$)`).test(t))
        || null;
}

const swatchStyle = (g) => `--a:${g.alpha}`;

export function gradeButton(g) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'grade';
    b.dataset.grade = g.id;
    b.setAttribute('style', swatchStyle(g));
    b.innerHTML = '<div class="sw"></div><b></b><span></span>';
    b.querySelector('b').textContent = g.label;
    b.querySelector('span').textContent = g.name || '';
    return b;
}

export function initTint(root) {
    if (!root || root.dataset.tintBound) return;
    const list = grades();
    const box = root.querySelector('.grades');
    if (!list.length || !box) { root.hidden = !list.length; return; }
    root.dataset.tintBound = '1';

    const set = (id) => {
        const g = list.find((x) => x.id === String(id)) || list[Math.min(1, list.length - 1)];
        root.querySelectorAll('.grade').forEach((b) => b.classList.toggle('active', b.dataset.grade === g.id));
        root.querySelectorAll('[data-t]').forEach((el) => {
            const k = el.dataset.t;
            if (k === 'label') el.textContent = g.label;
            else if (k === 'name') el.textContent = g.name || '';
            else if (k === 'desc') el.textContent = g.desc || '';
            else el.textContent = `${g[k]}%`;
        });
        root.querySelectorAll('[data-bar]').forEach((el) => { el.style.width = `${g[el.dataset.bar]}%`; });
        root.dataset.selected = g.id;
        root.dispatchEvent(new CustomEvent('grade', { detail: g }));
    };

    box.replaceChildren(...list.map(gradeButton));
    box.addEventListener('click', (e) => {
        const b = e.target.closest('.grade');
        if (b) set(b.dataset.grade);
    });
    root.azelSetGrade = set;
    set(root.dataset.default || (list[1] || list[0]).id);
}
