import { memo } from 'react';
import type { ProductsListSource } from '@salla.sa/twilight-theme-engine/api/product';
import { useTranslation } from '@salla.sa/twilight-theme-engine/i18n';
import { SectionHead } from '../../azel/SectionHead';
import { ProductsGrid } from './ProductsGrid';
import { pick } from '../../../lib/azel/utils';
import type { BlockProps } from './types';

interface ProductsData {
  eyebrow?: string;
  title?: string;
  subtitle?: string;
  link_text?: string;
  link_url?: unknown;
  source?: unknown;
  category?: unknown;
  products?: unknown;
  limit?: number | string;
  white_bg?: boolean;
}

const refId = (entry: unknown): number | undefined => {
  const raw =
    typeof entry === 'object' && entry !== null
      ? ((entry as { id_?: unknown; id?: unknown; value?: unknown }).id_ ??
        (entry as { id?: unknown }).id ??
        (entry as { value?: unknown }).value)
      : entry;
  const id = Number(raw);
  return Number.isFinite(id) && id > 0 ? id : undefined;
};

/**
 * `home.azel-products`: a product grid with the design's section head. Add it as
 * many times as needed; each instance picks its own source.
 */
export const AzelProducts = memo(function AzelProducts({ data }: BlockProps<ProductsData>) {
  const { t } = useTranslation();
  const source = pick(data.source) || 'latest';
  const limit = Number(data.limit) || 8;
  const category = refId(Array.isArray(data.category) ? data.category[0] : data.category);
  const picked = (Array.isArray(data.products) ? data.products : data.products ? [data.products] : [])
    .map(refId)
    .filter((id): id is number => id !== undefined);
  const ready =
    ['latest', 'sales', 'top-rated', 'offers'].includes(source) ||
    (source === 'categories' && !!category) ||
    (source === 'selected' && picked.length > 0);

  return (
    <section className={`section az${data.white_bg ? ' bg-white-az' : ''}`}>
      <div className="container">
        {(data.eyebrow || data.title || data.link_text) && (
          <SectionHead
            eyebrow={data.eyebrow}
            title={data.title}
            subtitle={data.subtitle}
            linkText={data.link_text}
            linkHref={data.link_url}
          />
        )}
        {ready ? (
          <div className="products">
            <ProductsGrid
              source={source as ProductsListSource}
              sourceValue={
                source === 'categories' ? [category as number] : source === 'selected' ? picked : undefined
              }
              limit={source === 'selected' ? picked.length : limit}
            />
          </div>
        ) : (
          <p className="az-empty">{t('azel.home.products_empty')}</p>
        )}
      </div>
    </section>
  );
});
