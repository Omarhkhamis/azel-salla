import { FiltersSkeleton, Pulse, ProductsListSkeleton } from '@salla.sa/twilight-components-react';

/**
 * `pendingComponent` for every product list: the Azel page head and layout, with a
 * `Pulse` standing in for the text, so nothing shifts once the real page arrives.
 * Without one, the router blanks the route on every sort or filter reload.
 */
export function ProductListSkeleton({ hideFilters = false }: { hideFilters?: boolean }) {
  return (
    <>
      <section className="page-hero az" aria-hidden="true">
        <div className="container">
          <Pulse className="h-4 w-64" />
          <Pulse className="h-8 w-56 mt-4" />
        </div>
      </section>
      <section className="section-sm az">
        <div className={`container shop-layout${hideFilters ? ' no-filters' : ''}`}>
          {!hideFilters && <FiltersSkeleton className="filters" />}
          <ProductsListSkeleton count={hideFilters ? 8 : 6} columns={hideFilters ? 4 : 3} />
        </div>
      </section>
    </>
  );
}
