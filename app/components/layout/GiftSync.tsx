import { useEffect, useRef } from 'react';
import { usePackageIds } from '../azel/useAzel';
import { trimGifts } from '../../lib/azel/gift';
import { sdk, whenSdkReady } from '../../lib/azel/sdk';

/**
 * Keeps the gifts in step with the packages: when a package's quantity goes down
 * or it leaves the cart (cart page, cart drawer, anywhere), the gifts that no
 * longer have a package come out, newest first. Renders nothing.
 */
export function GiftSync() {
  const packageIds = usePackageIds();
  const idsRef = useRef(packageIds);
  idsRef.current = packageIds;

  useEffect(
    () =>
      whenSdkReady(() => {
        const event = sdk()?.event;
        let timer: ReturnType<typeof setTimeout> | undefined;
        let running = false;
        let again = false;

        const run = async () => {
          if (running) {
            again = true;
            return;
          }
          const cart = sdk()?.cart;
          const details = sdk()?.api?.cart?.details;
          if (!idsRef.current.length || !cart?.updateItem || !cart.deleteItem || !details) return;
          running = true;
          try {
            await trimGifts(
              {
                // with each line's options, to tell the fragrance's colours apart
                details: () => details(null, ['options']),
                updateItem: cart.updateItem,
                deleteItem: cart.deleteItem,
              },
              idsRef.current
            );
          } catch (error) {
            sdk()?.logger?.error?.('azel:: gift sync', error);
          } finally {
            running = false;
            if (again) {
              again = false;
              void run();
            }
          }
        };
        // a burst of stepper clicks settles first
        const schedule = () => {
          clearTimeout(timer);
          timer = setTimeout(() => void run(), 400);
        };

        event?.on?.('cart::item.updated', schedule);
        event?.on?.('cart::item.deleted', schedule);
        return () => {
          clearTimeout(timer);
          event?.off?.('cart::item.updated', schedule);
          event?.off?.('cart::item.deleted', schedule);
        };
      }),
    []
  );

  return null;
}
