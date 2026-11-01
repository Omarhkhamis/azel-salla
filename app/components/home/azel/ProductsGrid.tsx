import { memo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { product, type ProductsListSource } from '@salla.sa/twilight-theme-engine/api/product';
import { useTranslation } from '@salla.sa/twilight-theme-engine/i18n';
import { ProductCardSkeleton } from '@salla.sa/twilight-theme-engine/common';
import { ProductCard } from '../../product';
import { useHideSoldOut } from '../../azel/useAzel';
import { visibleProducts } from '../../../lib/azel/utils';

interface ProductsGridProps {
  source: ProductsListSource;
  sourceValue?: number | string | number[] | null;
  limit?: number;
  hidden?: boolean;
}

/** One `.products` grid of the Azel card, fetched from a store source. */
export const ProductsGrid = memo(function ProductsGrid({
  source,
  sourceValue,
  limit = 8,
  hidden,
}: ProductsGridProps) {
  const { t } = useTranslation();
  const hideSoldOut = useHideSoldOut();
  const { data, isSuccess, isError } = useQuery(
    product.queries.list({ source, sourceValue: sourceValue ?? undefined, perPage: limit })
  );
  const items = visibleProducts(data?.items, hideSoldOut).slice(0, limit);

  if (hidden) return null;
  if (!isSuccess && !isError) {
    return (
      <>
        {Array.from({ length: Math.min(limit, 4) }, (_, i) => (
          <ProductCardSkeleton key={i} />
        ))}
      </>
    );
  }
  if (!items.length) {
    return <p className="az-empty-list">{t('pages.categories.no_products', 'No products found')}</p>;
  }
  return (
    <>
      {items.map((item, i) => (
        <ProductCard key={item.id} product={item} index={i} />
      ))}
    </>
  );
});
