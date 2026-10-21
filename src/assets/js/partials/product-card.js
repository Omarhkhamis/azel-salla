/**
 * AZEL — <custom-salla-product-card>
 * ---------------------------------------------------------------------------
 * The card Salla renders for every product it lists. <salla-products-list>
 * looks for this exact tag name, so defining it here replaces Salla's stock
 * card everywhere — the home grids, the category grid, search, related
 * products — with the design's .p-card (Azel+/assets/js/main.js, productCard),
 * while Salla keeps owning fetching, filtering and pagination.
 *
 * Card anatomy, as in the design:
 *   badge (promotion title, or «خصم N%» on sale) · wishlist heart · image
 *   category · name · rating (when there is one) · price · round add button
 *   («+» adds straight to the cart; «←» leads to the product when it has
 *   options to choose first).
 */
import { icon, esc, money, amount, stars } from './azel-utils';

class AzelProductCard extends HTMLElement {
    connectedCallback() {
        this.product = this.product || JSON.parse(this.getAttribute('product') || '{}');

        if (window.app?.status === 'ready') this.onReady();
        else document.addEventListener('theme::ready', () => this.onReady(), { once: true });
    }

    onReady() {
        this.placeholder = salla.url.asset(salla.config.get('theme.settings.placeholder') || 'images/placeholder.png');
        salla.lang.onLoaded(() => this.render());
        this.render();
    }

    badge() {
        const p = this.product;
        if (p.promotion_title) return `<span class="badge">${esc(p.promotion_title)}</span>`;
        const regular = amount(p.regular_price);
        const sale = amount(p.sale_price);
        if (p.is_on_sale && regular > 0 && sale > 0 && sale < regular) {
            const d = Math.round((1 - sale / regular) * 100);
            const label = document.documentElement.dataset.discountLabel || '';
            return `<span class="badge">${esc(label)} ${esc(salla.helpers?.number ? salla.helpers.number(d) : d)}%</span>`;
        }
        return '';
    }

    price() {
        const p = this.product;
        if (p.is_on_sale) return `<del>${money(p.regular_price)}</del>${money(p.sale_price)}`;
        if (p.starting_price) return money(p.starting_price);
        return money(p.price);
    }

    rating() {
        const p = this.product;
        if (document.documentElement.dataset.cardRating !== '1') return '';
        const r = Number(p.rating?.stars) || 0;
        const n = Number(p.rating?.count) || 0;
        if (!r || !n) return p.subtitle ? `<div class="p-model">${esc(p.subtitle)}</div>` : '';
        return `<div class="p-rating">${stars(r)} <span class="num">${esc(r.toFixed(1).replace(/\.0$/, ''))}</span> <span>(${esc(n)})</span></div>`;
    }

    action() {
        const p = this.product;
        const label = document.documentElement.dataset;
        if (p.is_out_of_stock) {
            return `<span class="add-btn is-out" title="${esc(label.outOfStock || '')}" aria-label="${esc(label.outOfStock || '')}">${icon('x', 'i-sm')}</span>`;
        }
        // Options have to be chosen on the product page; adding straight to the
        // cart from a card would skip them — the arrow leads there, as in the design.
        if (p.has_options || p.type === 'donating' || p.type === 'booking') {
            return `<a href="${esc(p.url)}" class="add-btn" aria-label="${esc(label.chooseOptions || '')}">${icon('arrowL', 'i-sm i-flip')}</a>`;
        }
        return `<button type="button" class="add-btn" data-add="${esc(p.id)}" aria-label="${esc(label.addToCart || '')}">${icon('plus', 'i-sm')}</button>`;
    }

    render() {
        const p = this.product;
        const img = p.image?.url || p.thumbnail || this.placeholder;
        const cat = p.category?.name || '';
        const fit = document.documentElement.dataset.cardFit === 'cover' ? ' cover' : '';
        const wished = (salla.storage.get('salla::wishlist', []) || []).map(Number).includes(Number(p.id));

        this.innerHTML = `
        <article class="p-card az${p.is_out_of_stock ? ' sold-out' : ''}" id="product-${esc(p.id)}">
            ${this.badge()}
            <button type="button" class="wish${wished ? ' on' : ''}" data-id="${esc(p.id)}" aria-label="${esc(document.documentElement.dataset.wishlist || '')}">${icon('heart', 'i-sm')}</button>
            <a href="${esc(p.url)}" class="p-media${fit}"><img src="${esc(img)}" alt="${esc(p.image?.alt || p.name)}" loading="lazy"></a>
            <div class="p-body">
                ${cat ? `<span class="p-cat">${esc(cat)}</span>` : ''}
                <h3 class="p-title"><a href="${esc(p.url)}">${esc(p.name)}</a></h3>
                ${this.rating()}
                <div class="p-foot">
                    <span class="price">${this.price()}</span>
                    ${this.action()}
                </div>
            </div>
        </article>`;
    }
}

customElements.define('custom-salla-product-card', AzelProductCard);
