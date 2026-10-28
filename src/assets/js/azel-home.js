/**
 * AZEL — home page (pages/index.twig).
 *   - trust strip     tap / keyboard toggles the details (hover is CSS)
 *   - tint card       the grade explorer; its button carries ?grade=NN
 *   - showcase        category tabs, each tab's product list built on first open
 *   - voice reviews   the design's waveform player, for a direct file, a
 *                     Google Drive / Dropbox link or a SoundCloud track
 *
 * Several sections of the same kind can sit on the page (the merchant adds
 * them from the editor), so everything is bound per element, never by id.
 */
import { initTint } from './partials/azel-tint';
import { icon, esc } from './partials/azel-utils';
import { resolveSource, createPlayer } from './partials/azel-voice-source';

/* ================= شريط الثقة ================= */
function initTrust() {
    document.querySelectorAll('.trust-item').forEach((item) => {
        const toggle = () => {
            const open = !item.classList.contains('open');
            item.closest('.trust-grid')?.querySelectorAll('.trust-item.open').forEach((o) => {
                o.classList.remove('open');
                o.setAttribute('aria-expanded', 'false');
            });
            item.classList.toggle('open', open);
            item.setAttribute('aria-expanded', String(open));
        };
        item.addEventListener('click', (e) => { if (!e.target.closest('a')) toggle(); });
        item.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); }
        });
    });
}

/* ================= بطاقة الدرجات ================= */
function withGrade(url, id) {
    if (!url || url === '#') return url;
    try {
        const u = new URL(url, location.href);
        u.searchParams.set('grade', id);
        return u.toString();
    } catch (e) { return url; }
}

function initTintCards() {
    document.querySelectorAll('.hero-tint[data-tint]').forEach((root) => {
        const cta = root.querySelector('[data-tint-cta]');
        root.addEventListener('grade', (e) => {
            if (cta && root.dataset.cta) cta.href = withGrade(root.dataset.cta, e.detail.id);
        });
        initTint(root);
    });
}

/* ================= منتجات بتبويبات ================= */
function initShowcase(section) {
    const tabs = [...section.querySelectorAll('[data-tab-source]')];
    const grid = section.querySelector('[data-showcase-grid]');
    const more = section.querySelector('[data-showcase-more]');
    if (!tabs.length || !grid) { section.hidden = !tabs.length; return; }
    const lists = new Map();

    const show = (tab) => {
        tabs.forEach((t) => {
            t.classList.toggle('active', t === tab);
            t.setAttribute('aria-selected', String(t === tab));
        });
        lists.forEach((el) => { el.hidden = true; });
        let list = lists.get(tab);
        if (!list) {
            list = document.createElement('salla-products-list');
            list.setAttribute('source', tab.dataset.tabSource);
            if (tab.dataset.tabId) list.setAttribute('source-value', `[${tab.dataset.tabId}]`);
            list.setAttribute('limit', grid.dataset.limit || '8');
            list.setAttribute('autoload', 'false');
            lists.set(tab, list);
            grid.append(list);
        }
        list.hidden = false;
        if (more) more.href = tab.dataset.tabUrl || more.dataset.defaultUrl || '#';
    };

    section.addEventListener('click', (e) => {
        const tab = e.target.closest('[data-tab-source]');
        if (tab) show(tab);
    });
    show(tabs[0]);
}

/* ================= التقييمات الصوتية ================= */
const BARS = 44;

/** The design's deterministic waveform: the same bars for the same reviewer. */
function wave(seed) {
    let h = 0;
    for (const ch of seed) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
    return Array.from({ length: BARS }, (_, i) => {
        h = (h * 1103515245 + 12345) >>> 0;
        const env = Math.sin(Math.PI * (i + 0.5) / BARS) * 0.55 + 0.45;
        return Math.round((28 + (h % 72)) * env);
    });
}

const fmt = (t) => (!isFinite(t) ? '0:00' : `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`);

function initVoice(grid) {
    const cards = [...grid.querySelectorAll('[data-voice]')];
    const section = grid.closest('[data-voice-section]');
    const badge = section?.querySelector('.voice-count');
    if (!cards.length) { if (section) section.hidden = true; return; }
    const count = badge?.querySelector('[data-voice-count]');
    if (count) count.textContent = `${salla.helpers?.number ? salla.helpers.number(cards.length) : cards.length} ${cards.length === 1 ? badge.dataset.one : badge.dataset.many}`;
    const rtl = document.documentElement.dir !== 'ltr';
    const labels = grid.dataset;
    const players = new Map();

    cards.forEach((card) => {
        const source = resolveSource(card.dataset.src);
        const btn = card.querySelector('.vc-play');
        const waveEl = card.querySelector('.vc-wave');
        const time = card.querySelector('.vc-time');
        const embed = card.querySelector('.vc-embed');
        waveEl.innerHTML = wave(card.dataset.seed || '').map((h) => `<i style="height:${h}%"></i>`).join('');
        const bars = [...waveEl.children];
        let state = { current: 0, duration: NaN }, playing = false, player = null;

        const paint = () => {
            const p = state.duration ? state.current / state.duration : 0;
            const n = Math.round(p * bars.length);
            bars.forEach((b, k) => b.classList.toggle('on', k < n));
            waveEl.setAttribute('aria-valuenow', String(Math.round(p * 100)));
            time.textContent = !playing && !state.current ? fmt(state.duration) : fmt(state.current);
        };
        const setPlaying = (on) => {
            playing = on;
            card.classList.toggle('playing', on);
            btn.innerHTML = icon(on ? 'pause' : 'play');
            btn.setAttribute('aria-label', on ? labels.pauseLabel : labels.playLabel);
        };
        // the source's own player, when the design's cannot drive it
        const fallback = () => {
            if (!source?.embed) return unavailable();
            player?.pause();
            player?.frame?.remove();
            setPlaying(false);
            embed.innerHTML = `<iframe src="${esc(source.embed)}" height="${Number(source.embedHeight) || 120}" allow="autoplay; encrypted-media" loading="lazy" title="${esc(card.querySelector('.vc-who b')?.textContent || '')}"></iframe>`;
            embed.hidden = false;
            card.querySelector('.vc-player').hidden = true;
            card.classList.add('embedded');
        };
        const unavailable = () => {
            card.classList.add('unavailable');
            btn.disabled = true;
            time.textContent = labels.soonLabel || '';
        };

        const ensure = () => {
            if (player || !source) return player;
            player = createPlayer(source, card);
            players.set(card, player);
            player.on('time', (t) => { state = t; paint(); });
            player.on('play', () => setPlaying(true));
            player.on('pause', () => setPlaying(false));
            player.on('end', () => { setPlaying(false); state.current = 0; paint(); });
            player.on('error', unavailable);
            player.on('fallback', fallback);
            return player;
        };
        if (!source) { unavailable(); return; }
        // SoundCloud loads an iframe: only once the card is near the screen,
        // so it is ready (duration shown) before the visitor presses play
        if (source.kind === 'soundcloud' && 'IntersectionObserver' in window) {
            const io = new IntersectionObserver((es) => { if (es.some((e) => e.isIntersecting)) { io.disconnect(); ensure(); } }, { rootMargin: '300px' });
            io.observe(card);
        } else ensure();

        btn.addEventListener('click', () => {
            const p = ensure();
            if (!p) return;
            if (p.paused()) {
                players.forEach((other, c) => { if (c !== card) other.pause(); });
                p.play();
            } else p.pause();
        });

        const seekBy = (sec) => { if (player && state.duration) player.seek((state.current + sec) / state.duration); };
        waveEl.addEventListener('click', (e) => {
            if (!player) return;
            const r = waveEl.getBoundingClientRect();
            // RTL: progress grows from the right
            player.seek(rtl ? (r.right - e.clientX) / r.width : (e.clientX - r.left) / r.width);
        });
        waveEl.addEventListener('keydown', (e) => {
            const fwd = rtl ? 'ArrowLeft' : 'ArrowRight';
            const back = rtl ? 'ArrowRight' : 'ArrowLeft';
            if (e.key === fwd) { seekBy(5); e.preventDefault(); }
            if (e.key === back) { seekBy(-5); e.preventDefault(); }
            if (e.key === ' ' || e.key === 'Enter') { btn.click(); e.preventDefault(); }
        });
    });
}

salla.onReady(() => {
    [
        ['trust', initTrust],
        ['tint', initTintCards],
        ['showcase', () => document.querySelectorAll('[data-showcase]').forEach(initShowcase)],
        ['voice', () => document.querySelectorAll('.voice-grid').forEach(initVoice)],
    ].forEach(([name, start]) => {
        try { start(); } catch (error) { salla.logger.error(`azel:: home ${name} failed to start`, error); }
    });
});
