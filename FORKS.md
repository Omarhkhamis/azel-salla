# Engine forks

These theme components are copies of engine components, changed for Raed. The engine does not
update them, so each upgrade of `@salla.sa/twilight-theme-engine` can leave them behind. This file
records where each one came from, so you can see what changed upstream.

**Base** is the engine version in the repo when the fork was last edited. It is the oldest
upstream change the fork might have taken in, not proof that it was synced then.

| Fork (`app/components/…`)     | Engine source (`tailwind/…` in the engine)    | Wired in by                                        | Base   | What the fork changes                                                                                      |
| ----------------------------- | --------------------------------------------- | -------------------------------------------------- | ------ | ---------------------------------------------------------------------------------------------------------- |
| `product/ProductPage.tsx`     | `routes/product/ProductPage.tsx`              | `app/routes/$slug.p$id.tsx`                        | 1.0.141 | Rebuilt as the Azel page: own gallery, price/«وفّر», instalment line, perks, tabs, related grid, sticky buy bar. Keeps the engine slots, `PageBlocks`, comments and the `user.can_comment` copy |
| `product/AddToCartForm.tsx`   | `components/product/AddToCartForm.tsx`        | `ProductPage`                                      | 1.0.141 | Azel buy row (quantity, add, wishlist), «اشترِ الآن», `TintPickers` above Salla's options (button mode); no price block or quick-buy widget |
| `product/ProductListPage.tsx` | `routes/product-listing/ProductListPage.tsx`  | `registry` `product:list-page` in `app/router.tsx` | 1.0.141 | Azel page head, filter drawer, code banner, pills, toolbar with the visible count, 3-column grid with a load-more button, `hide_sold_out` |
| `cart/CartPage.tsx`           | `routes/cart/CartPage.tsx`                    | `app/routes/cart.tsx`                              | 1.0.141 | Azel checkout steps, one titled items panel, warranty note, Azel empty state; error state with retry |
| `cart/CartItem.tsx`           | `components/cart/CartItem.tsx`                | `CartPage`                                         | 1.0.64 | Flat row, no "Total:" label, trash icon at row end, React quantity stepper                                 |
| `page/PageSingle.tsx`         | `routes/page/PageSingle.tsx`                  | `app/routes/$slug.page-$id.tsx`                    | 1.0.141 | `customised` pages render only the hook; content with `<section>` prints full width; plain content gets the Azel head and prose card |
| `home/FixedProducts.tsx`      | `components/home/FixedProducts.tsx`           | `registerHomeComponents` in `app/router.tsx`       | 1.0.47 | Same markup, uses the theme `ProductCard`, and shows the block's `limit` products instead of always 4        |

The product card (`product/ProductCard.tsx`) is not a fork: it is the Azel card written from
scratch and registered as `product:card`. The Twig original is `custom-salla-product-card` in
the Azel-Salla theme.

## Upgrading the engine

The engine package ships each component's source as `tailwind/<path>.tsx.txt`, under the path in
**Engine source**. For each fork, compare that file between **Base** and the new version and port
what applies:

```bash
for v in 1.0.86 1.0.90; do
  mkdir -p engine-$v && tar -xzf "$(npm pack @salla.sa/twilight-theme-engine@$v --silent)" -C engine-$v
done
diff -u engine-1.0.86/package/tailwind/routes/product/ProductPage.tsx.txt \
  engine-1.0.90/package/tailwind/routes/product/ProductPage.tsx.txt
```

Then set **Base** to the new version. Packages before 1.0.86 have no source copy, so for an older
**Base** compare the fork with the 1.0.86 source in full.

## Adding a fork

Add a row here, and say at the top of the file's doc comment what differs from the engine. Fork
only when a hook slot, the `registry`, or a home-component key can't do the job: every fork is
code you now maintain by hand. See
[Fork a built-in route](https://docs.salla.dev/twilight/react/recipes/fork-a-built-in-route).
