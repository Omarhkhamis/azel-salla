import { route } from '@tanstack/virtual-file-routes';
import type { VirtualRouteNode } from '@tanstack/virtual-file-routes';

// Add or replace routes here, e.g. `route('/faq', 'faq.tsx')` from '@tanstack/virtual-file-routes'.
export const routes: VirtualRouteNode[] = [
  // Salla's "new URLs" product links, `/p{id}-{name}` (e.g. `/p266197567-azelplus`).
  route('/p{$id}', 'product-key.tsx'),
];
