import { memo, useMemo, useState } from 'react';
import { AzLink } from '../../azel/AzLink';
import { ProductsGrid } from './ProductsGrid';
import { lines, linkUrl } from '../../../lib/azel/utils';
import type { BlockProps } from './types';

interface CategoryRef {
  id?: string | number;
  id_?: string | number;
  name?: string;
  label?: string;
  title?: string;
  value?: string | number;
  url?: string;
}

interface ShowcaseData {
  eyebrow?: string;
  title?: string;
  all_label?: string;
  categories?: unknown;
  tab_names?: string;
  limit?: number | string;
  more_text?: string;
  more_url?: unknown;
}

interface Tab {
  key: string;
  label: string;
  categoryId?: string | number;
  url: string;
}

/** A picked category is an object or a bare id; the products API wants the numeric id. */
function categoryTabs(raw: unknown, names: string[]): Tab[] {
  const list = Array.isArray(raw) ? raw : raw ? [raw] : [];
  return list.flatMap((entry: CategoryRef | string | number, i): Tab[] => {
    const cat: CategoryRef = typeof entry === 'object' ? entry : { id: entry };
    const id = cat.id_ ?? cat.id ?? cat.value;
    if (!id) return [];
    const label = names[i] || cat.name || cat.label || cat.title || '';
    return [{ key: `cat-${id}`, label, categoryId: id, url: cat.url ?? '' }];
  });
}

/**
 * `home.azel-showcase`: category tabs over a product grid. A tab's products are
 * fetched the first time it is opened, not all of them at load.
 */
export const AzelShowcase = memo(function AzelShowcase({ data }: BlockProps<ShowcaseData>) {
  const moreUrl = linkUrl(data.more_url);
  const limit = Number(data.limit) || 8;
  const tabs = useMemo<Tab[]>(() => {
    const names = lines(data.tab_names);
    return [
      ...(data.all_label ? [{ key: 'all', label: data.all_label, url: moreUrl }] : []),
      ...categoryTabs(data.categories, names),
    ];
  }, [data.all_label, data.categories, data.tab_names, moreUrl]);

  const [activeKey, setActiveKey] = useState<string | null>(null);
  const [opened, setOpened] = useState<string[]>([]);
  const active = tabs.find((tab) => tab.key === activeKey) ?? tabs[0];

  if (!tabs.length) return null;
  const seen = opened.includes(active.key) ? opened : [...opened, active.key];

  return (
    <section className="section az">
      <div className="container">
        <div className="section-head center">
          {data.eyebrow && <span className="eyebrow">{data.eyebrow}</span>}
          {data.title && <h2 className="section-title">{data.title}</h2>}
        </div>
        <div className="cat-pills showcase-tabs" role="tablist">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              className={`pill${tab.key === active.key ? ' active' : ''}`}
              role="tab"
              aria-selected={tab.key === active.key}
              onClick={() => {
                setOpened(seen);
                setActiveKey(tab.key);
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <div className="products">
          {tabs
            .filter((tab) => seen.includes(tab.key))
            .map((tab) => (
              <ProductsGrid
                key={tab.key}
                source={tab.categoryId ? 'categories' : 'latest'}
                sourceValue={tab.categoryId ? [Number(tab.categoryId)] : undefined}
                limit={limit}
                hidden={tab.key !== active.key}
              />
            ))}
        </div>
        {data.more_text && (
          <div className="section-more">
            <AzLink href={active.url || moreUrl} className="btn btn-outline">
              {data.more_text}
            </AzLink>
          </div>
        )}
      </div>
    </section>
  );
});
