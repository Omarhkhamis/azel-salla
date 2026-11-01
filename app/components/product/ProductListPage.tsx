import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { HookSlot } from '@salla.sa/twilight-theme-engine/hooks';
import { useStore } from '@salla.sa/twilight-theme-engine/hooks/useStore';
import { useTranslation } from '@salla.sa/twilight-theme-engine/i18n';
import { useLocation, useNavigate } from '@salla.sa/twilight-theme-engine/providers';
import { onSallaEvent, sortOptions } from '@salla.sa/twilight-theme-engine/utils';
import { Breadcrumb, Image, NoContent, ProductCardSkeleton } from '@salla.sa/twilight-theme-engine/common';
import { SallaFilters } from '@salla.sa/twilight-components-react/filters';
import { ItemsList, type ItemsLoaderFn } from '@salla.sa/twilight-components-react';
import { useReorderButtons } from '@salla.sa/twilight-theme-engine/home';
import { parseNextPageToken, product, type ProductListFilters } from '@salla.sa/twilight-theme-engine/api/product';
import {
  useAppliedFilters,
  type ProductListLoaderData,
} from '@salla.sa/twilight-theme-engine/routes/product-listing';
import type { Product } from '@salla.sa/twilight-theme-engine/types';
import { BlockHookSlot } from '../common';
import { AzLink } from '../azel/AzLink';
import { CopyButton } from '../azel/CopyButton';
import { Icon } from '../azel/Icon';
import { useHideSoldOut, useNum, useSettings } from '../azel/useAzel';
import { useLayers } from '../layout';
import { ProductCard } from './ProductCard';
import { parseLinks, plainText, visibleProducts } from '../../lib/azel/utils';

/** Infinite scroll: the route loaded the first page, this fetches from `pagination.next`. */
function useCatalogLoader(
  source: ProductListLoaderData['source'],
  selectedSort: string,
  next: string | null | undefined,
  filters: ProductListFilters | null
): ItemsLoaderFn<Product> {
  const hideSoldOut = useHideSoldOut();
  const nextCursorRef = useRef<string | null>(next ?? null);
  useEffect(() => {
    nextCursorRef.current = next ?? null;
  }, [next]);

  return useCallback(async () => {
    const { cursor, page } = parseNextPageToken(nextCursorRef.current);
    const result = await product.list({
      source: source.type,
      sourceValue: source.value,
      ...(cursor && { cursor }),
      ...(page !== undefined && { page }),
      sort: selectedSort,
      ...(filters && { filterable: true, filters }),
    });
    nextCursorRef.current = result.next;
    return { ...result, items: visibleProducts(result.items, hideSoldOut) };
  }, [source.type, source.value, selectedSort, filters, hideSoldOut]);
}

type BrandEntity = { name: string; banner?: string; logo?: string; description?: string };
type CategoryEntity = {
  name?: string;
  url?: string;
  description?: string;
  subtitle?: string;
  sub_categories?: { id?: unknown; name?: string; url?: string }[];
};

/** Banner + logo + description above the listing, for a brand page. */
function BrandHeader({ source }: { source: ProductListLoaderData['source'] }) {
  if (source.type !== 'brands') return null;
  const brand = source.entity as BrandEntity | undefined;
  if (!brand) return null;
  return (
    <>
      <Image
        width={1200}
        height={300}
        className="w-full max-h-[300px] object-cover rounded bg-gray-100"
        src={brand.banner || undefined}
        alt={brand.name}
        priority
      />
      <header className="flex flex-col md:flex-row items-center md:items-start text-center mt-2 mb-8">
        <Image
          className="rounded w-40 h-24 object-contain shadow-md p-4 bg-white shrink-0"
          src={brand.logo || undefined}
          alt={brand.name}
          aspectRatio="5/3"
        />
        {brand.description && (
          <div className="px-5 pt-3 text-start">
            <p
              className="text-base text-gray-500 font-medium"
              dangerouslySetInnerHTML={{ __html: brand.description }}
            />
          </div>
        )}
      </header>
    </>
  );
}

/**
 * The pills: the theme setting's links when filled, otherwise the current
 * category's sub-categories, with its own page as «الكل». The pill of the page
 * being viewed is marked once in the browser.
 */
function CategoryPills({ category }: { category?: CategoryEntity }) {
  const { t } = useTranslation();
  const get = useSettings();
  const { pathname } = useLocation();
  const [here, setHere] = useState<string | null>(null);
  useEffect(() => setHere(window.location.pathname.replace(/\/+$/, '')), [pathname]);

  const fromSettings = parseLinks(get('shop_pills_links', ''));
  const subs = category?.sub_categories ?? [];
  const pills = fromSettings.length
    ? fromSettings
    : subs.length
      ? [
          { label: t('azel.shop.all'), url: category?.url ?? '#' },
          ...subs.map((sub) => ({ label: sub.name ?? '', url: sub.url ?? '#' })),
        ]
      : [];
  if (!pills.length) return null;

  const matches = (url: string) => {
    if (!here) return false;
    try {
      return new URL(url, window.location.href).pathname.replace(/\/+$/, '') === here;
    } catch {
      return false;
    }
  };
  const anyMatch = pills.some((pill) => matches(pill.url));

  return (
    <nav className="cat-pills shop-pills" aria-label={t('azel.shop.sections')}>
      {pills.map((pill, i) => {
        const active = anyMatch ? matches(pill.url) : !fromSettings.length && i === 0;
        return (
          <AzLink key={`${pill.label}-${i}`} className={`pill${active ? ' active' : ''}`} href={pill.url}>
            {pill.label}
          </AzLink>
        );
      })}
    </nav>
  );
}

function ShopBanner() {
  const { t } = useTranslation();
  const get = useSettings();
  const title = get<string>('shop_banner_title', '');
  const code = String(get('shop_banner_code', '') ?? '').trim();
  if (get('shop_banner_enabled', true) === false || !(title || code)) return null;
  return (
    <div className="cat-banner">
      <div>
        {title && <h3>{title}</h3>}
        <p>
          {get<string>('shop_banner_text_start', '')}
          {code && (
            <>
              {' '}
              <b className="ltr">{code}</b>
            </>
          )}{' '}
          {get<string>('shop_banner_text_end', '')}
        </p>
      </div>
      {code && (
        <CopyButton code={code} className="btn btn-lime btn-sm">
          {t('azel.shop.copy_code')}
        </CopyButton>
      )}
    </div>
  );
}

/**
 * «عرض N منتج»: the cards on screen, kept in step as pages load (the list keeps its
 * own accumulated items, so the grid's DOM is the only place that knows the count).
 */
function useVisibleCount(gridRef: React.RefObject<HTMLElement | null>) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    const grid = gridRef.current;
    if (!grid) return;
    const paint = () => setCount(grid.querySelectorAll('.p-card').length);
    let queued = false;
    const observer = new MutationObserver(() => {
      if (queued) return;
      queued = true;
      requestAnimationFrame(() => {
        queued = false;
        paint();
      });
    });
    observer.observe(grid, { childList: true, subtree: true });
    paint();
    return () => observer.disconnect();
  }, [gridRef]);
  return count;
}

/**
 * The Azel listing (design: Azel+/shop.html), registered as `product:list-page`
 * for every product list: category, search, tag, brand and `/products`. Page head,
 * the filter card (an off-canvas drawer under 960px), the code banner, the pills,
 * the toolbar and a 3-column grid.
 */
export function ProductListPage({ page, source, query, products, pagination, filters }: ProductListLoaderData) {
  const { t } = useTranslation();
  const store = useStore();
  const get = useSettings();
  const num = useNum();
  const navigate = useNavigate();
  const location = useLocation();
  const hideSoldOut = useHideSoldOut();
  const { drawer, openDrawer, closeDrawers } = useLayers();
  const gridRef = useRef<HTMLDivElement>(null);
  const [filterCount, setFilterCount] = useState(0);
  const visibleCount = useVisibleCount(gridRef);

  const selectedSort = query.sort;
  const showFilters = !!(query.filters && store?.settings?.product?.filters);
  const {
    filters: appliedFilters,
    page: filteredPage,
    lastPage,
    status: filterStatus,
    retry: retryFilters,
  } = useAppliedFilters(source, selectedSort, showFilters);
  const shownPage = filterStatus === 'ready' ? filteredPage : lastPage;
  const shownProducts =
    filterStatus === 'error' ? [] : filterStatus === 'idle' ? products : (shownPage?.items ?? products);
  const shownNext =
    filterStatus === 'idle' ? pagination?.next : filterStatus === 'ready' ? filteredPage?.next : null;
  const filteredKey =
    filterStatus === 'idle'
      ? ''
      : `${filterStatus}${filterStatus === 'ready' ? JSON.stringify(appliedFilters) : ''}`;

  useReorderButtons(source.type === 'reorder');

  const sortList = useMemo(() => sortOptions(selectedSort, t), [selectedSort, t]);

  useEffect(
    () =>
      onSallaEvent('salla-filters::changed', (payload: unknown) => {
        const selection = (payload ?? {}) as Record<string, unknown>;
        setFilterCount(Object.keys(selection).filter((key) => key !== 'sort').length);
        if (window.innerWidth <= 960) closeDrawers();
      }),
    [closeDrawers]
  );

  const handleSortChange = useCallback(
    (event: React.ChangeEvent<HTMLSelectElement>) => {
      // `location.pathname`, not `window.location.pathname`: the router strips the
      // store's base off it and re-adds its own when navigating.
      const params = new URLSearchParams(location.searchStr);
      params.set('sort', event.target.value);
      params.delete('page');
      const search = params.toString();
      navigate(location.pathname + (search ? `?${search}` : ''));
    },
    [navigate, location.pathname, location.searchStr]
  );

  const listKey = source.value ?? source.type;
  // Merchant blocks go on category pages only, as in Twig; offers, search and brands get none.
  const blockScope = useMemo(
    () => (source.type === 'categories' && source.value ? { category_id: source.value } : undefined),
    [source.type, source.value]
  );
  const loader = useCatalogLoader(source, selectedSort, shownNext, appliedFilters);

  const category = source.type === 'categories' ? (source.entity as CategoryEntity | undefined) : undefined;
  const tagline =
    plainText(category?.description ?? category?.subtitle ?? '') ||
    (category ? '' : get<string>('shop_default_sub', ''));
  const items = visibleProducts(shownProducts, hideSoldOut);
  const listId = `${listKey}${filteredKey}-${selectedSort}`;

  return (
    <div key={listKey} data-source={source.type === 'reorder' ? 'reorder' : undefined}>
      <section className="page-hero az">
        <div className="container">
          {get('product_index_show_breadcrumbs', true) !== false && (
            <Breadcrumb page={page} className="crumbs" />
          )}
          <h1>{page.title}</h1>
          {tagline && <p>{tagline}</p>}
        </div>
      </section>

      <HookSlot name="product:list.start" />

      <BlockHookSlot
        name="product.index.before_products_group_with_filter"
        wrapper="s-before-products-list"
        className="!mt-0"
        scope={blockScope}
      />

      <section className="section-sm az">
        <div className={`container shop-layout${showFilters ? '' : ' no-filters'}`}>
          {showFilters && (
            <aside
              className={`filters${drawer === 'filters' ? ' open' : ''}`}
              id="filters"
              aria-label={t('azel.common.filters')}
            >
              <button
                className="h-btn close-filters"
                type="button"
                onClick={closeDrawers}
                aria-label={t('azel.common.close')}
              >
                <Icon name="x" />
              </button>
              <SallaFilters id="filters-menu" filters={filters as never} />
            </aside>
          )}

          <div>
            <BrandHeader source={source} />
            <ShopBanner />
            <CategoryPills category={category} />

            <div className="toolbar">
              <div className="toolbar-start">
                {showFilters && (
                  <button
                    className="btn btn-outline btn-sm filter-toggle"
                    type="button"
                    onClick={() => openDrawer('filters')}
                  >
                    <Icon name="filter" className="i-sm" /> {t('azel.common.filters')}
                    {filterCount > 0 && <b id="fcount"> ({num(filterCount)})</b>}
                  </button>
                )}
                {visibleCount > 0 && (
                  <span className="count" id="res-count">
                    {t('azel.shop.showing').split(':n')[0]}
                    <b>{num(visibleCount)}</b>
                    {t('azel.shop.showing').split(':n')[1]}
                  </span>
                )}
              </div>
              {sortList.length > 0 && (
                <div className="select">
                  <select
                    id="product-filter"
                    aria-label={t('azel.common.sort')}
                    value={selectedSort}
                    onChange={handleSortChange}
                  >
                    {sortList.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.name}
                      </option>
                    ))}
                  </select>
                  <Icon name="chevD" className="i-sm" />
                </div>
              )}
            </div>

            <HookSlot name="product:list.items.start" />
            {/* legacy name for the same point */}
            <HookSlot name="product:index.items.start" />

            <div
              ref={gridRef}
              className={`products cols-3${filterStatus === 'loading' ? ' opacity-60' : ''}`}
              id="grid"
              aria-busy={filterStatus === 'loading'}
            >
              {filterStatus === 'error' ? (
                <div className="flex flex-col items-center col-span-full">
                  <NoContent
                    icon="sicon-shopping-bag"
                    message={t('common.errors.error_occurred', 'Something went wrong')}
                  />
                  <button type="button" className="link--primary mt-4" onClick={retryFilters}>
                    {t('common.elements.try_again', 'Try again')}
                  </button>
                </div>
              ) : (
                <ItemsList<Product>
                  key={listId}
                  resetKey={listId}
                  items={items}
                  loader={loader}
                  mode={shownNext ? 'button' : 'static'}
                  pageUrl={location.pathname + location.searchStr}
                  className="s-products-list"
                  itemsClassName="s-products-list-wrapper"
                  skeleton={<ProductCardSkeleton />}
                  skeletonType="item"
                  skeletonCount={6}
                  empty={
                    <div className="az-empty-list">
                      {t('pages.categories.no_products', 'No products found in this category')}
                    </div>
                  }
                  t={(key, fallback) =>
                    key.includes('load_more') ? t('azel.common.load_more') : t(key, fallback || key)
                  }
                >
                  {(rows) => rows.map((row, i) => <ProductCard key={row.id} product={row} index={i} />)}
                </ItemsList>
              )}
            </div>

            {/* legacy name for the same point */}
            <HookSlot name="product:index.items.end" />
            <HookSlot name="product:list.items.end" />
          </div>
        </div>
      </section>

      <BlockHookSlot
        name="product.index.after_products_group_with_filter"
        wrapper="s-after-products-list"
        scope={blockScope}
      />
      <BlockHookSlot
        name="product.index.after_testimonials"
        wrapper="s-after-testimonials"
        scope={blockScope}
      />

      <HookSlot name="product:list.end" />
    </div>
  );
}
