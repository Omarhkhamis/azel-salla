/** The design's toasts are shown by `<Toasts />` in the layout; anything can ask for one. */
type ToastListener = (toast: { message: string; type?: string }) => void;

let listener: ToastListener | null = null;

export function showToast(message: string, type?: string) {
  if (message) listener?.({ message, type });
}

/** For `<Toasts />` only: it renders whatever is asked for. */
export function onToast(fn: ToastListener | null) {
  listener = fn;
}
