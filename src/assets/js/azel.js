/**
 * AZEL — shell interactions (every page, from layouts/master.twig).
 * ---------------------------------------------------------------------------
 * The behaviour of the static design's chrome (Azel+/assets/js/main.js),
 * wired to the store:
 *   - header                (scroll shadow, dashboard menu + mega menu, active link)
 *   - layers                (overlay, cart drawer, menu drawer, Esc)
 *   - search panel          (toggle + live results from salla.api.product.search)
 *   - cart drawer           (salla.cart — items, qty, delete, free shipping)
 *   - copy buttons          (coupon codes)
 *   - toasts                (salla.notify routed into the design's .toast)
 *   - product cards         (wishlist heart, quick add)
 *   - scroll reveal         (.reveal → .in)
 *
 * Every part boots on its own inside salla.onReady: one failing part must not
 * leave the others unbound.
 */

import { icon, esc, money, amount, toast } from './partials/azel-utils';

const $ = (s, root = document) => root.querySelector(s);
const $$ = (s, root = document) => [...root.querySelectorAll(s)];
const label = () => document.documentElement.dataset;

/* ================= الطبقات ================= */
export function openDrawer(id) {
    closeDrawers(true);
    document.getElementById(id)?.classList.add('open');
    $('#overlay')?.classList.add('open');
    document.body.classList.add('lock');
}

export function closeDrawers(keepOverlay) {
    $$('.drawer.open, .filters.open').forEach((d) => d.classList.remove('open'));
    if (!keepOverlay) {
        $('#overlay')?.classList.remove('open');
        document.body.classList.remove('lock');
    }
}
window.azelLayers = { open: openDrawer, close: closeDrawers };

function initLayers() {
    document.addEventListener('click', (e) => {
        const t = e.target.closest('[data-open],[data-close],#overlay,[data-login]');
        if (!t) return;
        if (t.id === 'overlay' || t.hasAttribute('data-close')) return closeDrawers();
        if (t.hasAttribute('data-login')) {
            e.preventDefault();
            closeDrawers();
            return salla.event.dispatch('login::open');
        }
        if (t.dataset.open) {
            e.preventDefault();
            return t.dataset.open === 'cart' ? openCart() : openDrawer(t.dataset.open);
        }
    });

    // <salla-cart-summary> links to the cart page; in this theme the cart is
    // the drawer, so the click is taken over here. The link stays in the
    // markup, so a middle-click or "open in new tab" still reaches the page.
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.header-actions salla-cart-summary')) return;
        if (salla.url.is_page && salla.url.is_page('cart')) return;
        e.preventDefault();
        openCart();
    });

    document.addEventListener('keydown', (e) => {
        if (e.key !== 'Escape') return;
        closeDrawers();
        $('#search-panel')?.classList.remove('open');
    });
}

/* ================= الهيدر ================= */
function initHeader() {
    const header = $('#header');
    if (!header) return;
    let ticking = false;
    const update = () => { header.classList.toggle('scrolled', window.scrollY > 10); ticking = false; };
    window.addEventListener('scroll', () => {
        if (ticking) return;
        ticking = true;
        requestAnimationFrame(update);
    }, { passive: true });
    update();
}

/** Marks the link of the page being viewed, the way the design does it. */
function markActive(links) {
    const here = (location.pathname.replace(/\/+$/, '') || '/') + location.search;
    links.forEach((a) => {
        if ((a.getAttribute('href') || '#').startsWith('#')) return;
        let u;
        try { u = new URL(a.href, location.href); } catch (e) { return; }
        if (u.origin !== location.origin) return;
        const path = (u.pathname.replace(/\/+$/, '') || '/') + u.search;
        a.classList.toggle('active', path === here);
    });
}

const isExternal = (url) => {
    try { return new URL(url, location.href).origin !== location.origin; } catch (e) { return false; }
};
const target = (url) => (isExternal(url) ? ' target="_blank" rel="noopener"' : '');

/** A dashboard menu item with sub-items → the design's mega menu. */
function megaItem(m, allLabel) {
    const kids = (m.children || []).filter((c) => c && c.title);
    return `<div class="nav-drop">
        <a href="${esc(m.url)}" aria-haspopup="true"${target(m.url)}>${esc(m.title)} ${icon('chevD', 'i-xs')}</a>
        <div class="mega" role="menu">
            ${kids.map((c) => `<a href="${esc(c.url)}" class="mega-item" role="menuitem"${target(c.url)}>
                <span class="mega-img">${c.image ? `<img src="${esc(c.image)}" alt="" loading="lazy">` : icon('box', 'i-sm')}</span>
                <span><b>${esc(c.title)}</b>${(c.children || []).length ? `<small>${esc((c.children || []).map((g) => g.title).slice(0, 3).join('، '))}</small>` : ''}</span>
            </a>`).join('')}
            ${m.url && m.url !== '#' ? `<a href="${esc(m.url)}" class="mega-all">${esc(allLabel)} ${icon('arrowL', 'i-sm i-flip')}</a>` : ''}
        </div>
    </div>`;
}

/** The same menu item in the mobile drawer: a titled list of sub-items. */
function mobileItem(m, sectionsLabel) {
    const chev = icon('chevL', 'i-sm i-flip');
    const kids = (m.children || []).filter((c) => c && c.title);
    if (!kids.length) return `<a href="${esc(m.url)}"${target(m.url)}>${esc(m.title)}${chev}</a>`;
    return `<span class="mnav-title">${esc(m.title || sectionsLabel)}</span>`
        + kids.map((c) => `<a href="${esc(c.url)}" class="mnav-cat"${target(c.url)}><span>${c.image ? `<img src="${esc(c.image)}" alt="">` : icon('box', 'i-sm')} ${esc(c.title)}</span>${chev}</a>`).join('')
        + '<span class="mnav-sep"></span>';
}

/**
 * The nav and the mobile drawer come from the merchant's header menu in the
 * Salla dashboard — unless the "header links" theme setting is filled, in
 * which case header.twig already rendered those links and nothing is fetched.
 */
function initMenu() {
    const nav = $('#nav');
    const mnav = $('#mobile-nav');
    if (!nav) return;

    if (nav.dataset.source !== 'dashboard') {
        markActive($$('a', nav));
        mnav && markActive($$('a', mnav));
        return;
    }

    salla.api.component.getMenus('header')
        .then(({ data }) => {
            const menus = (data || []).filter((m) => m && m.title);
            if (!menus.length) return;
            const slot = $('[data-menu-slot]', nav);
            if (slot) slot.outerHTML = menus.map((m) => ((m.children || []).length
                ? megaItem(m, nav.dataset.allLabel)
                : `<a href="${esc(m.url)}"${target(m.url)}>${esc(m.title)}</a>`)).join('');
            markActive($$('.main-nav > a, .nav-drop > a', nav));

            const mslot = mnav && $('[data-menu-slot]', mnav);
            if (mslot) mslot.outerHTML = menus.map((m) => mobileItem(m, mnav.dataset.sectionsLabel)).join('');
            mnav && markActive($$('a', mnav));
        })
        .catch((error) => salla.logger.error('azel:: header menu', error));
}

/* ================= البحث ================= */
function initSearch() {
    const panel = $('#search-panel');
    if (!panel) return;
    const input = $('input', panel);
    const box = $('#search-res');
    const form = $('form', panel);

    document.addEventListener('click', (e) => {
        if (!e.target.closest('[data-search]')) return;
        panel.classList.toggle('open');
        if (panel.classList.contains('open')) input.focus();
    });
    form?.addEventListener('submit', (e) => { if (!input.value.trim()) e.preventDefault(); });

    if (!box) return;
    let timer = null, seq = 0;
    input.addEventListener('input', () => {
        const q = input.value.trim();
        clearTimeout(timer);
        if (q.length < 2) { box.innerHTML = ''; return; }
        timer = setTimeout(() => {
            const mine = ++seq;
            const all = `${form.action}?q=${encodeURIComponent(q)}`;
            const none = `<div class="s-none">${esc(panel.dataset.noneLabel || '').replace(':q', esc(q))}</div>`;
            salla.api.product.search({ query: q, per_page: 5 })
                .then(({ data }) => {
                    if (mine !== seq) return;
                    const list = Array.isArray(data) ? data : (data?.products || []);
                    box.innerHTML = list.length
                        ? list.slice(0, 5).map((p) => `<a href="${esc(p.url)}"><img src="${esc(p.image?.url || p.thumbnail || '')}" alt="" loading="lazy"><span><span class="n">${esc(p.name)}</span><span class="c">${esc(p.category?.name || '')}</span></span><span class="price">${money(p.is_on_sale ? p.sale_price : (p.price ?? p.starting_price))}</span></a>`).join('')
                          + `<a class="s-all" href="${esc(all)}">${esc(panel.dataset.allLabel || '')} ${icon('arrowL', 'i-sm i-flip')}</a>`
                        : none;
                })
                .catch((error) => {
                    if (mine !== seq) return;
                    box.innerHTML = none;
                    salla.logger.error('azel:: search', error);
                });
        }, 250);
    });
}

/* ================= السلة ================= */
let cartBusy = false;

function cartDrawer() { return document.getElementById('cart'); }

function itemOptions(item) {
    const opts = Array.isArray(item.options) ? item.options : [];
    return opts.map((o) => {
        if (o == null) return '';
        // For a choice option Salla's value is the picked detail's id — show
        // the option's name with the detail's name instead.
        const details = o.details || [];
        const picked = details.filter((d) => d.is_selected || String(d.id) === String(o.value)).map((d) => d.name);
        const val = picked.length ? picked.join('، ') : (typeof o.value === 'string' || typeof o.value === 'number' ? o.value : '');
        return val ? (o.name ? `${o.name}: ${val}` : val) : '';
    }).filter(Boolean).join(' · ');
}

function shippingBar(cart) {
    const d = cartDrawer()?.dataset || {};
    const bar = cart.free_shipping_bar;
    const sub = amount(cart.sub_total);
    let remaining, percent, done;

    if (bar && bar.minimum_amount) {
        remaining = amount(bar.remaining);
        percent = Number(bar.percent) || 0;
        done = !!bar.has_free_shipping || remaining <= 0;
    } else {
        const minimum = Number(d.freeShipping) || 0;
        if (!minimum) return '';
        remaining = Math.max(0, minimum - sub);
        percent = Math.min(100, (sub / minimum) * 100);
        done = remaining <= 0;
    }

    return `<div class="free-ship">${done
        ? `${icon('check', 'i-xs')} ${esc(d.shipDone || '')}`
        : (esc(d.shipLeft || '')).replace(':amount', `<b class="num">${money(remaining)}</b>`)}
        <div class="progress"><span style="width:${done ? 100 : Math.min(100, percent)}%"></span></div></div>`;
}

function renderCart(cart) {
    const drawer = cartDrawer();
    if (!drawer) return;
    const body = $('#mini-cart'), foot = $('#mini-cart-foot');
    const d = drawer.dataset;
    const items = (cart && cart.items) || [];

    if (!items.length) {
        body.innerHTML = `<div class="cart-empty"><div class="empty-ico">${icon('bag', 'i-lg')}</div><h4>${esc(d.emptyTitle)}</h4><p>${esc(d.emptyText)}</p><a href="${esc(d.shopUrl)}" class="btn" data-close>${esc(d.emptyBtn)}</a></div>`;
        foot.innerHTML = '';
        return;
    }

    const placeholder = salla.url.asset(salla.config.get('theme.settings.placeholder') || 'images/placeholder.png');
    body.innerHTML = items.map((i) => {
        const img = i.product_image || i.image || placeholder;
        const name = i.product_name || i.name || '';
        const meta = itemOptions(i);
        const locked = i.is_hidden_quantity || i.type === 'donating';
        return `<div class="mini-item" data-item="${esc(i.id)}">
            <a href="${esc(i.url)}"><img src="${esc(img)}" alt="" loading="lazy"></a>
            <div><h4><a href="${esc(i.url)}">${esc(name)}</a></h4>${meta ? `<div class="meta">${esc(meta)}</div>` : ''}
                ${locked ? '' : `<div class="qty sm"><button type="button" data-cq="1" aria-label="${esc(d.more)}">${icon('plus', 'i-xs')}</button><b>${esc(i.quantity)}</b><button type="button" data-cq="-1" aria-label="${esc(d.less)}">${icon('minus', 'i-xs')}</button></div>`}
            </div>
            <div class="mi-end"><div class="price">${i.is_available === false ? esc(d.outOfStock) : money(i.total)}</div><button type="button" class="mi-rm" data-crm aria-label="${esc(d.remove)}">${icon('trash', 'i-sm')}</button></div>
        </div>`;
    }).join('');

    foot.innerHTML = `${shippingBar(cart)}
        <div class="sum-row total"><span>${esc(d.total)}</span><span class="price">${money(cart.sub_total ?? cart.total)}</span></div>
        <p class="mc-note">${esc(d.note)}</p>
        <div class="mc-btns"><a href="${esc(d.cartUrl)}" class="btn btn-outline">${esc(d.view)}</a><button type="button" class="btn" data-checkout>${esc(d.checkout)}</button></div>`;
}

function loadCart() {
    return salla.api.cart.details()
        .then(({ data }) => { renderCart(data?.cart || data || {}); })
        .catch((error) => {
            // no cart yet (a first visit) reads as an empty cart
            renderCart({ items: [] });
            salla.logger.error('azel:: cart details', error);
        });
}

export function openCart() {
    const body = $('#mini-cart');
    if (body && !body.children.length) body.innerHTML = '<div class="cart-loading">…</div>';
    openDrawer('cart');
    loadCart();
}

function initCart() {
    const drawer = cartDrawer();
    if (!drawer) return;

    // The drawer replaces Salla's add-to-cart popup: it opens on every add,
    // from a card, the product page or any Salla component — except on the
    // cart page itself, where the page already is the cart.
    salla.cart.event.onItemAdded((response) => {
        if (salla.url.is_page && salla.url.is_page('cart')) return;
        if (document.body.dataset.buyNow) return;
        const cart = response?.data?.cart;
        if (cart && cart.items) { renderCart(cart); openDrawer('cart'); } else openCart();
    });

    drawer.addEventListener('click', (e) => {
        if (e.target.closest('[data-checkout]')) {
            e.preventDefault();
            const btn = e.target.closest('[data-checkout]');
            btn.disabled = true;
            salla.event.once('cart::submit.failed', () => { btn.disabled = false; });
            // the drawer has no cart page around it: if submit is not possible
            // (a guest without login, say) the cart page takes over
            try { salla.cart.submit(); } catch (error) { location.href = drawer.dataset.cartUrl; }
            return;
        }

        const row = e.target.closest('.mini-item');
        if (!row || cartBusy) return;
        const id = row.dataset.item;
        const step = e.target.closest('[data-cq]');
        const del = e.target.closest('[data-crm]');
        if (!step && !del) return;

        cartBusy = true;
        row.classList.add('busy');
        let req;
        if (del) {
            req = salla.cart.deleteItem(id);
        } else {
            const current = Number(row.querySelector('.qty b')?.textContent) || 1;
            const next = current + Number(step.dataset.cq);
            req = next < 1 ? salla.cart.deleteItem(id) : salla.cart.updateItem({ id, quantity: next });
        }
        req.then(() => loadCart())
            .catch((error) => { row.classList.remove('busy'); salla.logger.error('azel:: cart update', error); })
            .finally(() => { cartBusy = false; });
    });

    // a link inside the drawer leaves the page — close it first so a
    // back-navigation does not restore an open drawer
    drawer.addEventListener('click', (e) => { if (e.target.closest('a[href]')) closeDrawers(); });
}

/* ================= نسخ الكود ================= */
function initCopy() {
    document.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-copy]');
        if (!btn) return;
        e.preventDefault();
        const code = btn.dataset.copy;
        const done = () => toast((label().copied || '').replace(':code', code));
        if (navigator.clipboard?.writeText) navigator.clipboard.writeText(code).then(done, done);
        else done();
    });
}

/* ================= التوست ================= */
/**
 * Salla reports everything (added to cart, errors, wishlist…) through
 * salla.notify. Raed installs a SweetAlert notifier on theme::ready; this one
 * replaces it with the design's own toast.
 */
function initNotifier() {
    const install = () => salla.notify.setNotifier((message, type, data) => {
        // add-to-cart is announced by the drawer sliding open
        if (data?.data?.googleTags?.event === 'addToCart') return;
        const text = typeof message === 'object' ? (message?.title || message?.text || '') : message;
        if (text) toast(String(text), type);
    });
    if (window.app?.status === 'ready') install();
    document.addEventListener('theme::ready', install);
}

/* ================= بطاقات المنتج: المفضلة والإضافة السريعة ================= */
function syncWish(id, on) {
    $$(`.wish[data-id="${id}"],.pdp-wish[data-id="${id}"]`).forEach((b) => b.classList.toggle('on', on));
}

function initCards() {
    const paintAll = () => (salla.storage.get('salla::wishlist', []) || []).forEach((id) => syncWish(id, true));
    paintAll();
    document.addEventListener('azel::cards', paintAll);
    salla.wishlist.event.onAdded((res, id) => syncWish(id, true));
    salla.wishlist.event.onRemoved((res, id) => syncWish(id, false));

    document.addEventListener('click', (e) => {
        const wish = e.target.closest('.wish[data-id],.pdp-wish[data-id]');
        if (wish) {
            e.preventDefault();
            e.stopPropagation();
            salla.wishlist.toggle(Number(wish.dataset.id))
                .catch((error) => salla.logger.error('azel:: wishlist', error));
            return;
        }

        const add = e.target.closest('.add-btn[data-add]');
        if (add) {
            e.preventDefault();
            e.stopPropagation();
            if (add.dataset.busy) return;
            add.dataset.busy = '1';
            add.classList.add('is-loading');
            salla.cart.addItem({ id: Number(add.dataset.add), quantity: 1 })
                .then(() => {
                    add.classList.add('added');
                    add.innerHTML = icon('check', 'i-sm');
                    setTimeout(() => { add.classList.remove('added'); add.innerHTML = icon('plus', 'i-sm'); }, 1500);
                })
                .catch((error) => salla.logger.error('azel:: quick add', error))
                .finally(() => { delete add.dataset.busy; add.classList.remove('is-loading'); });
        }
    }, true);
}

/* ================= الظهور عند التمرير ================= */
export function observeReveal(scope = document) {
    const els = $$('.reveal:not(.in)', scope);
    if (!('IntersectionObserver' in window)) { els.forEach((el) => el.classList.add('in')); return; }
    if (!window.__azelReveal) {
        window.__azelReveal = new IntersectionObserver((entries) => entries.forEach((en) => {
            if (!en.isIntersecting) return;
            en.target.classList.add('in');
            window.__azelReveal.unobserve(en.target);
        }), { threshold: 0.12 });
    }
    els.forEach((el) => window.__azelReveal.observe(el));
}

/* ================= إخفاء المنتجات النافدة (اختياري) ================= */
/**
 * Salla returns sold-out products in every list. The platform exposes an
 * official hook for this exact case, so the theme filters through it rather
 * than hiding cards with CSS, which would leave holes in the grid.
 * Registered as early as the SDK allows: a hook added after the first fetch
 * would miss it.
 */
function registerSoldOutFilter() {
    if (document.documentElement.dataset.hideSoldOut !== '1') return false;
    if (!window.salla?.hooks?.registerHook) return false;

    const inStock = (p) => p && p.is_available !== false && !p.is_out_of_stock;
    ['salla-products-list', 'salla-products-slider'].forEach((tag) => {
        salla.hooks.registerHook(tag, 'beforeAppendItems', (ctx) => {
            if (Array.isArray(ctx?.items)) ctx.items = ctx.items.filter(inStock);
        });
    });
    return true;
}

const soldOutFilterReady = registerSoldOutFilter();

/* ================= الإقلاع ================= */
salla.onReady(() => {
    [
        ['layers', initLayers],
        ['header', initHeader],
        ['menu', initMenu],
        ['search', initSearch],
        ['cart', initCart],
        ['copy', initCopy],
        ['notifier', initNotifier],
        ['cards', initCards],
        ['reveal', () => observeReveal()],
        ['sold-out filter', () => { if (!soldOutFilterReady) registerSoldOutFilter(); }],
    ].forEach(([name, start]) => {
        try { start(); } catch (error) { salla.logger.error(`azel:: ${name} failed to start`, error); }
    });
});

