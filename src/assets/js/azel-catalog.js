/**
 * AZEL — category / listing page (pages/product/index.twig) and the
 * install-centers page (page-single.twig).
 *   - the filter card as an off-canvas drawer under 960px, with its count
 *   - «عرض N منتج»: the number of cards on screen, kept in step as pages load
 *   - install centers: the city pills
 * Sorting stays with the inherited products.js (#product-filter).
 */
import { num } from './partials/azel-utils';

function initFilters() {
    const count = document.getElementById('fcount');
    if (!document.getElementById('filters')) return;
    salla.event.on('salla-filters::changed', (filters) => {
        const n = Object.keys(filters || {}).filter((k) => k !== 'sort').length;
        if (count) count.textContent = n ? ` (${num(n)})` : '';
        if (window.innerWidth <= 960) window.azelLayers?.close();
    });
}

function initCount() {
    const out = document.getElementById('res-count');
    const grid = document.getElementById('grid');
    if (!out || !grid) return;
    const paint = () => {
        const n = grid.querySelectorAll('custom-salla-product-card').length;
        out.hidden = !n;
        out.innerHTML = (out.dataset.label || '').replace(':n', `<b>${num(n)}</b>`);
    };
    let queued = false;
    new MutationObserver(() => {
        if (queued) return;
        queued = true;
        requestAnimationFrame(() => { queued = false; paint(); });
    }).observe(grid, { childList: true, subtree: true });
    paint();
}

/** Marks the pill of the page being viewed. */
function initPills() {
    const pills = [...document.querySelectorAll('[data-pills] a.pill')];
    if (!pills.length) return;
    const here = location.pathname.replace(/\/+$/, '');
    const match = pills.find((a) => {
        try { return new URL(a.href, location.href).pathname.replace(/\/+$/, '') === here; } catch (e) { return false; }
    });
    if (match) pills.forEach((a) => a.classList.toggle('active', a === match));
}

/* ================= مراكز التركيب ================= */
function initCenters() {
    const root = document.querySelector('[data-centers]');
    if (!root) return;
    const bar = root.querySelector('.city-bar');
    const cities = [...root.querySelectorAll('[data-city]')];
    const groups = [...root.querySelectorAll('[data-city-group]')];
    const params = new URLSearchParams(location.search);

    const show = (city) => {
        cities.forEach((b) => b.classList.toggle('active', b.dataset.city === city));
        groups.forEach((g) => { g.hidden = g.dataset.cityGroup !== city; });
    };
    bar?.addEventListener('click', (e) => {
        const b = e.target.closest('[data-city]');
        if (!b) return;
        show(b.dataset.city);
        history.replaceState(null, '', `?city=${encodeURIComponent(b.dataset.city)}`);
    });
    const wanted = params.get('city');
    show(cities.some((b) => b.dataset.city === wanted) ? wanted : cities[0]?.dataset.city);
}

salla.onReady(() => {
    [
        ['filters', initFilters],
        ['count', initCount],
        ['pills', initPills],
        ['centers', initCenters],
    ].forEach(([name, start]) => {
        try { start(); } catch (error) { salla.logger.error(`azel:: catalog ${name} failed to start`, error); }
    });
});
