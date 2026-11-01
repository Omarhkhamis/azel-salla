/** The parts of the Salla SDK the theme calls that the engine's types do not declare. */
export interface AzelSdk {
  onReady?: () => Promise<unknown>;
  event?: {
    on?: (name: string, fn: (...args: never[]) => void) => void;
    off?: (name: string, fn: (...args: never[]) => void) => void;
    once?: (name: string, fn: (...args: never[]) => void) => void;
    dispatch?: (name: string, ...args: unknown[]) => void;
  };
  notify?: {
    setNotifier?: (fn: (message: unknown, type?: string, data?: unknown) => void) => void;
  };
  cart?: {
    addItem?: (item: { id: number; quantity: number }) => Promise<unknown>;
    updateItem?: (item: { id: unknown; quantity: number }) => Promise<unknown>;
    deleteItem?: (id: unknown) => Promise<unknown>;
    submit?: () => unknown;
  };
  api?: {
    cart?: { details?: () => Promise<{ data?: unknown }> };
  };
  logger?: { error?: (...args: unknown[]) => void };
}

/** Browser only: call from an effect or an event handler. */
export const sdk = (): AzelSdk | undefined =>
  typeof window === 'undefined' ? undefined : (window.salla as unknown as AzelSdk | undefined);

/** Runs `bind` once the SDK can subscribe, and the returned cleanup undoes it. */
export function whenSdkReady(bind: () => void | (() => void)): () => void {
  let bound = false;
  let undo: void | (() => void);
  const run = () => {
    if (bound || !sdk()?.event?.on) return;
    bound = true;
    undo = bind();
  };
  run();
  document.addEventListener('theme::ready', run);
  return () => {
    document.removeEventListener('theme::ready', run);
    if (typeof undo === 'function') undo();
  };
}
