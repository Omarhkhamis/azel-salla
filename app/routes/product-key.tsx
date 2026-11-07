import { createFileRoute, notFound } from '@tanstack/react-router';
import { Product } from '@salla.sa/twilight-theme-engine/routes/product';
import type { ProductPageProps } from '@salla.sa/twilight-theme-engine/routes/product';
import { ProductDetailSkeleton } from '@salla.sa/twilight-theme-engine/skeleton';
import { withHead } from '@salla.sa/twilight-theme-engine/tanstack';
import { ProductPage } from '../components/product/ProductPage';
import { productIdFromKey } from '../lib/productKey';

/**
 * A product in Salla's "new URLs" format, `/p{id}-{name}`: the links the store's API
 * gives every product when that format is on. The engine has a route only for
 * `/{slug}/p{id}` and resolves this one in the browser from its 404 page, so the server
 * answered 404 to every product link. This renders the product page itself, from the
 * server, with the same loader and head as `$slug.p$id.tsx`.
 * Any other `/p…` path (no product id) falls through to the 404 page.
 */
export const Route = createFileRoute('/{-$locale}/p{$id}')({
  loader: ({ params }): Promise<ProductPageProps> => {
    const id = productIdFromKey(params.id);
    if (!id) throw notFound();
    // Keep the product's own category trail instead of the page the visitor came from.
    try {
      if (typeof window !== 'undefined') {
        window.sessionStorage?.removeItem('breadcrumb-referrer');
      }
    } catch {
      /* private mode */
    }
    return Product.loader({ params: { id }, locale: params.locale });
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
