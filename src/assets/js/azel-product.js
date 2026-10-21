/**
 * AZEL — product page (pages/product/single.twig, design: Azel+/product.html).
 *   - gallery         thumbnails swap the main photo; an option image shows it
 *   - price extras    the «وفّر N» tag and the 4-payments line, re-priced on
 *                     every variant change
 *   - tint pickers    Salla's own options stay in the form (validation, pricing,
 *                     stock). Options whose values are all tint grades are
 *                     mirrored into the design's pickers, which click Salla's
 *                     real inputs:
 *                       two or more → per-zone rows + car diagram (#opt-zones)
 *                       exactly one → swatch cards (#opt-grade)
 *   - validation      a missing required option shows the design's error line
 *   - buy now         add to cart, then straight to checkout
 *   - tabs, sticky buy bar (mobile)
 */
import { grades, gradeFor } from './partials/azel-tint';
import { esc } from './partials/azel-utils';

const $ = (s, root = document) => root.querySelector(s);
const $$ = (s, root = document) => [...root.querySelectorAll(s)];

/* ================= المعرض ================= */
function initGallery() {
    const photo = $('#main-photo');
    const thumbs = $('#thumbs');
    if (!photo) return;
    const show = (btn) => {
        if (!btn) return;
        photo.src = btn.dataset.src;
        $$('button', thumbs).forEach((b) => b.classList.toggle('active', b === btn));
    };
    thumbs?.addEventListener('click', (e) => show(e.target.closest('button[data-src]')));

    // an option whose value carries an image (thumbnails, colours) shows it
    document.addEventListener('change', (e) => {
        const input = e.target.closest('salla-product-options input[data-img-id]');
        if (!input || !input.checked || !thumbs) return;
        show(thumbs.querySelector(`button[data-id="${input.dataset.imgId}"]`));
    });
}

/* ================= السعر: وفّر + التقسيط ================= */
function initPriceExtras() {
    const wrap = $('.pdp-price');
    const tag = wrap?.querySelector('[data-save]');
    const bnpl = $('[data-bnpl]');
    const bnplText = bnpl?.querySelector('[data-bnpl-text]');

    const paintSave = (regular, sale) => {
        if (!tag) return;
        const r = parseFloat(regular), s = parseFloat(sale);
        const on = r > 0 && s > 0 && s < r;
        tag.hidden = !on;
        if (!on) return;
        // salla.money returns markup (the riyal may be an icon), so the label
        // goes in as text and Salla's amount as HTML.
        tag.textContent = `${wrap.dataset.saveLabel} `;
        tag.insertAdjacentHTML('beforeend', salla.money(r - s));
    };
    const paintBnpl = (price) => {
        if (!bnplText) return;
        const p = parseFloat(price) || 0;
        bnpl.hidden = p <= 0;
        const part = p / (Number(bnpl.dataset.parts) || 4);
        bnplText.innerHTML = esc(bnplText.dataset.template || '').replace(':amount', `<b>${salla.money(part)}</b>`);
    };

    if (wrap) paintSave(wrap.dataset.regular, wrap.dataset.sale);
    if (bnpl) paintBnpl(bnpl.dataset.price);

    salla.product.event.onPriceUpdated((res) => {
        const d = res?.data || {};
        const onSale = d.has_sale_price && Number(d.regular_price) > Number(d.price);
        paintSave(onSale ? d.regular_price : 0, onSale ? d.price : 0);
        paintBnpl(d.price);
        // product.js writes the regular price into .before-price on every update
        $$('.pdp-price .before-price').forEach((el) => el.classList.toggle('hidden', !onSale));
    });
}

/* ================= منتقيات درجة التظليل ================= */
const ZONE_KEYS = ['front', 'fside', 'rside', 'rear'];

/** Which glass of the diagram an option is, from its name — or its order. */
function zoneKey(name, index) {
    const n = String(name || '');
    const side = /جانب|جوانب|side/i.test(n);
    const front = /أمام|امام|front/i.test(n);
    const rear = /خلف|rear|back/i.test(n);
    if (side && front) return 'fside';
    if (side && rear) return 'rside';
    if (front) return 'front';
    if (rear) return 'rear';
    return ZONE_KEYS[index] || null;
}

/** Salla's rendered options whose every value is a tint grade. */
function readGradeOptions(root) {
    return $$('.s-product-options-option-container', root).map((box) => {
        if (box.classList.contains('hidden')) return null;
        const inputs = $$('.s-product-options-grid-mode input[type=radio]', box);
        if (inputs.length < 2) return null;
        const details = inputs.map((input) => {
            const text = (input.nextElementSibling?.textContent || '').trim();
            return { input, text, grade: gradeFor(text) };
        });
        if (details.some((d) => !d.grade)) return null;
        const label = $('.s-product-options-option-label b', box);
        const name = (label?.firstChild?.textContent || label?.textContent || '').replace('*', '').trim();
        return { box, id: box.dataset.optionId, name, required: box.querySelector('.s-product-options-option')?.dataset.optionRequired === 'true', details };
    }).filter(Boolean);
}

const checkedOf = (root, optionId) => $(`.s-product-options-option-container[data-option-id="${optionId}"] input[type=radio]:checked`, root);

/** Click Salla's own input so its handlers run (price, conditions, validation). */
function pickInput(root, optionId, value) {
    const input = $(`.s-product-options-option-container[data-option-id="${optionId}"] input[type=radio][value="${value}"]`, root);
    if (input && !input.checked && !input.disabled) input.click();
}

function initTintPickers() {
    const root = $('salla-product-options');
    const zonesBox = $('#opt-zones');
    const gradeBox = $('#opt-grade');
    if (!root || !grades().length) return;
    const wanted = new URLSearchParams(location.search).get('grade');
    let signature = '';
    let preselected = false;

    const paintZones = (opts) => {
        const tpl = zonesBox.dataset.picked || ':name';
        opts.forEach((o) => {
            const row = $(`[data-row="${o.id}"]`, zonesBox);
            const checked = checkedOf(root, o.id);
            const picked = checked ? o.details.find((d) => d.input.value === checked.value) : null;
            $$('[data-z]', row).forEach((b) => b.classList.toggle('active', !!picked && b.dataset.v === picked.input.value));
            row?.classList.toggle('done', !!picked);
            if (picked) row?.classList.remove('missing');
            const lab = row && $('[data-pick-label]', row);
            if (lab) lab.textContent = picked ? tpl.replace(':name', picked.grade.name).replace(':heat', picked.grade.heat) : zonesBox.dataset.unpicked;
            const g = $(`.car-diagram [data-zone="${o.zone}"]`, zonesBox);
            if (g) { g.classList.toggle('set', !!picked); g.style.setProperty('--a', picked ? picked.grade.alpha : 0); }
        });
        $$('[data-all]', zonesBox).forEach((b) => b.classList.toggle('active', opts.every((o) => {
            const c = checkedOf(root, o.id);
            return c && o.details.find((d) => d.input.value === c.value)?.grade.id === b.dataset.all;
        })));
        if (opts.every((o) => checkedOf(root, o.id))) $('#zone-err').hidden = true;
    };

    const buildZones = (opts) => {
        opts.forEach((o, i) => { o.zone = zoneKey(o.name, i); });
        $('#zone-rows').innerHTML = opts.map((o) => `
            <div class="zone-row" data-row="${esc(o.id)}" data-zone-key="${esc(o.zone || '')}">
                <div class="zone-name">${esc(o.name)}${o.required ? ' <i>*</i>' : ''}<small data-pick-label>${esc(zonesBox.dataset.unpicked)}</small></div>
                <div class="zone-opts">${o.details.map((d) => `<button type="button" class="zone-btn" data-z="${esc(o.id)}" data-v="${esc(d.input.value)}"${d.input.disabled ? ' disabled' : ''}><b>${esc(d.grade.label)}</b><span>${esc(d.grade.short || d.grade.name)}</span></button>`).join('')}</div>
            </div>`).join('');
        // «نفس الدرجة للكل»: a grade every zone offers
        const common = grades().filter((g) => opts.every((o) => o.details.some((d) => d.grade.id === g.id)));
        const all = $('#zone-all');
        $$('[data-all]', all).forEach((b) => b.remove());
        common.forEach((g) => {
            const b = document.createElement('button');
            b.type = 'button';
            b.dataset.all = g.id;
            b.textContent = g.label;
            all.append(b);
        });
        all.hidden = common.length < 2;
        // the diagram keeps only the glass this product has
        $$('.car-diagram [data-zone]', zonesBox).forEach((g) => { g.style.display = opts.some((o) => o.zone === g.dataset.zone) ? '' : 'none'; });
    };

    const buildSingle = (o) => {
        $('[data-grade-title]', gradeBox).textContent = o.name;
        const box = $('.grades', gradeBox);
        box.innerHTML = o.details.map((d) => `<button type="button" class="grade" data-v="${esc(d.input.value)}" style="--a:${d.grade.alpha}"${d.input.disabled ? ' disabled' : ''}><div class="sw"></div><b>${esc(d.grade.label)}</b><span>${esc(d.grade.name)}</span></button>`).join('');
    };

    const paintSingle = (o) => {
        const checked = checkedOf(root, o.id);
        const picked = checked ? o.details.find((d) => d.input.value === checked.value) : null;
        $$('.grade', gradeBox).forEach((b) => b.classList.toggle('active', !!picked && b.dataset.v === picked.input.value));
        const g = picked?.grade;
        $$('[data-t]', gradeBox).forEach((el) => { el.textContent = g ? (g[el.dataset.t] ?? '') : '—'; });
        if (picked) $('#grade-err').hidden = true;
    };

    let current = [];
    const sync = () => {
        const opts = readGradeOptions(root);
        const sig = opts.map((o) => `${o.id}:${o.details.map((d) => d.input.value).join(',')}`).join('|');
        $$('.az-mirrored', root).forEach((b) => { if (!opts.some((o) => o.box === b)) b.classList.remove('az-mirrored'); });
        opts.forEach((o) => o.box.classList.add('az-mirrored'));

        const zoneMode = opts.length > 1;
        if (sig !== signature) {
            signature = sig;
            if (zoneMode) buildZones(opts);
            else if (opts.length === 1) buildSingle(opts[0]);
        } else if (zoneMode) {
            opts.forEach((o, i) => { o.zone = current[i]?.zone ?? zoneKey(o.name, i); });
        }
        current = opts;
        zonesBox.hidden = !zoneMode;
        gradeBox.hidden = opts.length !== 1;

        // ?grade=NN from the hero card preselects every grade option once
        if (!preselected && wanted && opts.length) {
            preselected = true;
            opts.forEach((o) => {
                const d = o.details.find((x) => x.grade.id === wanted);
                if (d) pickInput(root, o.id, d.input.value);
            });
        }

        if (zoneMode) paintZones(opts);
        else if (opts.length === 1) paintSingle(opts[0]);
    };

    zonesBox?.addEventListener('click', (e) => {
        const b = e.target.closest('[data-z]');
        if (b) { pickInput(root, b.dataset.z, b.dataset.v); return; }
        const all = e.target.closest('[data-all]');
        if (all) {
            current.forEach((o) => {
                const d = o.details.find((x) => x.grade.id === all.dataset.all);
                if (d) pickInput(root, o.id, d.input.value);
            });
            return;
        }
        const zone = e.target.closest('.car-diagram [data-zone]');
        if (zone) {
            const row = $(`[data-zone-key="${zone.dataset.zone}"]`, zonesBox);
            highlight(zone.dataset.zone);
            row?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        }
    });
    const highlight = (key) => $$('[data-zone-key],.car-diagram [data-zone]', zonesBox)
        .forEach((el) => el.classList.toggle('hl', !!key && (el.dataset.zoneKey || el.dataset.zone) === key));
    zonesBox?.addEventListener('mouseover', (e) => {
        const el = e.target.closest('[data-zone-key],.car-diagram [data-zone]');
        highlight(el ? (el.dataset.zoneKey || el.dataset.zone) : null);
    });
    zonesBox?.addEventListener('mouseleave', () => highlight(null));

    gradeBox?.addEventListener('click', (e) => {
        const b = e.target.closest('.grade[data-v]');
        if (b && current[0]) pickInput(root, current[0].id, b.dataset.v);
    });

    // Salla re-renders its options (conditions, variants): re-read and repaint
    root.addEventListener('change', () => requestAnimationFrame(sync));
    let queued = false;
    new MutationObserver(() => {
        if (queued) return;
        queued = true;
        requestAnimationFrame(() => { queued = false; sync(); });
    }).observe(root, { childList: true, subtree: true });
    sync();
}

/* ================= التحقق من الخيارات ================= */
/**
 * The browser validates the required options before the form submits and
 * fires `invalid` on each missing one. For a mirrored grade option (its
 * Salla row is visually hidden) the native bubble would point at nothing, so
 * it is suppressed and the design's own error is shown instead.
 */
function initValidation() {
    let scrolled = false;
    const reset = () => setTimeout(() => { scrolled = false; }, 400);
    const scrollTo = (el) => {
        if (scrolled || !el) return;
        scrolled = true;
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        reset();
    };

    document.addEventListener('invalid', (e) => {
        const box = e.target.closest?.('.s-product-options-option-container');
        if (!box) return;
        if (box.classList.contains('az-mirrored')) {
            e.preventDefault();
            const zones = $('#opt-zones');
            if (zones && !zones.hidden) {
                $(`[data-row="${box.dataset.optionId}"]`, zones)?.classList.add('missing');
                $('#zone-err').hidden = false;
                scrollTo(zones);
            } else {
                $('#grade-err').hidden = false;
                scrollTo($('#opt-grade'));
            }
            return;
        }
        const err = $('#opt-err');
        if (err) err.hidden = false;
    }, true);

    document.addEventListener('change', (e) => {
        if (!e.target.closest?.('salla-product-options')) return;
        const form = $('.product-form');
        const opts = $('salla-product-options');
        if (form && opts && !$$('input:invalid, select:invalid, textarea:invalid', opts).length) $('#opt-err').hidden = true;
    });
}

/* ================= اشترِ الآن + الشريط السفلي ================= */
function initBuy() {
    const form = $('.product-form');
    if (!form) return;
    const submit = () => {
        if (!form.reportValidity()) return false;
        if (form.requestSubmit) form.requestSubmit(); else form.dispatchEvent(new Event('submit', { cancelable: true }));
        return true;
    };

    const buyNow = $('#buy-now');
    buyNow?.addEventListener('click', () => {
        if (document.body.dataset.buyNow) return;
        document.body.dataset.buyNow = '1';
        buyNow.disabled = true;
        const release = () => { delete document.body.dataset.buyNow; buyNow.disabled = false; };
        if (!submit()) { release(); return; }
        setTimeout(release, 15000);
        salla.event.once('cart::item.added.failed', release);
    });

    // add-to-cart from «اشترِ الآن» goes straight to checkout instead of the drawer
    salla.cart.event.onItemAdded(() => {
        if (!document.body.dataset.buyNow) return;
        salla.event.once('cart::submit.failed', () => { delete document.body.dataset.buyNow; buyNow && (buyNow.disabled = false); });
        salla.cart.submit();
    });

    $('#sb-add')?.addEventListener('click', submit);

    const bar = $('#sticky-buy');
    const add = $('#add');
    if (bar && add) {
        const update = () => bar.classList.toggle('show', add.getBoundingClientRect().bottom < 0);
        window.addEventListener('scroll', update, { passive: true });
        update();
    }
}

/* ================= التبويبات ================= */
function initTabs() {
    const tabs = $('.az-tabs');
    if (!tabs) return;
    const open = (btn) => {
        $$('[data-tab]', tabs).forEach((b) => {
            b.classList.toggle('active', b === btn);
            b.setAttribute('aria-selected', String(b === btn));
        });
        $$('.tab-panel', tabs.parentElement).forEach((p) => p.classList.toggle('active', p.id === btn.dataset.tab));
    };
    tabs.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-tab]');
        if (btn) open(btn);
    });
    document.addEventListener('click', (e) => {
        const link = e.target.closest('[data-open-tab]');
        if (!link) return;
        const btn = $(`#${link.dataset.openTab}`);
        if (!btn) return;
        e.preventDefault();
        open(btn);
        tabs.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });

    // «المواصفات» is Salla's custom fields: the tab shows only when they render
    const meta = $('#t-specs salla-metadata');
    const specsBtn = $('#tab-specs-btn');
    if (meta && specsBtn) {
        const check = () => { specsBtn.hidden = !meta.textContent.trim(); };
        new MutationObserver(check).observe(meta, { childList: true, subtree: true, characterData: true });
        check();
    }
}

salla.onReady(() => {
    [
        ['gallery', initGallery],
        ['price extras', initPriceExtras],
        ['tint pickers', initTintPickers],
        ['validation', initValidation],
        ['buy', initBuy],
        ['tabs', initTabs],
    ].forEach(([name, start]) => {
        try { start(); } catch (error) { salla.logger.error(`azel:: product ${name} failed to start`, error); }
    });
});
