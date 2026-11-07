import { createFileRoute, notFound } from '@tanstack/react-router';
import { Product } from '@salla.sa/twilight-theme-engine/routes/product';
import type { ProductPageProps } from '@salla.sa/twilight-theme-engine/routes/product';
import { ProductDetailSkeleton } from '@salla.sa/twilight-theme-engine/skeleton';
import { withHead } from '@salla.sa/twilight-theme-engine/tanstack';
import { ProductPage } from '../components/product/ProductPage';
import { productIdFromKey } from '../lib/productKey';

/** A language segment, as the router reads `ar` in `/ar/p123-name` as this route's slug. */
const LANGUAGE = /^[a-z]{2}(?:-[a-z]{2})?$/i;

export const Route = createFileRoute('/{-$locale}/$slug/p{$id}')({
  loader: ({ params }): Promise<ProductPageProps> => {
    // Keep the product's own category trail instead of the page the visitor came from.
    try {
      if (typeof window !== 'undefined') {
        window.sessionStorage?.removeItem('breadcrumb-referrer');
      }
    } catch {
      /* private mode */
    }
    // `/{locale}/p{id}-{name}`, Salla's "new URLs" link with a language in front, lands
    // here with the language as the slug and the name stuck to the id.
    let { id, locale } = params;
    if (!/^\d+$/.test(id)) {
      const key = productIdFromKey(id);
      if (!key) throw notFound();
      id = key;
      if (!locale && LANGUAGE.test(params.slug)) locale = params.slug;
    }
    return Product.loader({ params: { id }, locale });
  },
  head: withHead(Product),
  pendingComponent: () => <ProductDetailSkeleton />,
  component: ProductComponent,
});

function ProductComponent() {
  const data: ProductPageProps = Route.useLoaderData();
  // Remount for each product so the previous product's state resets.
  return <ProductPage key={data.product.id} {...data} />;
}
