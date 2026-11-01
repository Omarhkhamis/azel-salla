import { useEffect, useState } from 'react';
import { Icon } from '../azel/Icon';
import { sdk } from '../../lib/azel/sdk';
import { onToast, showToast } from '../../lib/azel/toast';

interface ToastItem {
  id: number;
  message: string;
  isError: boolean;
  out: boolean;
}

/**
 * The design's toast: dark green pill with a lime check, gone after 3.2s.
 * Renders the toasts and takes over `salla.notify`, which is how Salla reports
 * everything (errors, wishlist, login…). The engine's own Toaster installs its
 * notifier when the SDK is ready; this one goes after it. Add-to-cart is left
 * out: the cart drawer sliding open announces it.
 */
export function Toasts() {
  const [items, setItems] = useState<ToastItem[]>([]);

  useEffect(() => {
    let seq = 0;
    const timers = new Set<ReturnType<typeof setTimeout>>();
    const later = (fn: () => void, ms: number) => {
      const timer = setTimeout(() => {
        timers.delete(timer);
        fn();
      }, ms);
      timers.add(timer);
    };
    onToast(({ message, type }) => {
      const id = ++seq;
      setItems((list) => [...list, { id, message, isError: type === 'error', out: false }]);
      later(() => {
        setItems((list) => list.map((t) => (t.id === id ? { ...t, out: true } : t)));
        later(() => setItems((list) => list.filter((t) => t.id !== id)), 300);
      }, 3200);
    });

    let alive = true;
    const install = () =>
      sdk()?.notify?.setNotifier?.((message, type, data) => {
        const tags = (data as { data?: { googleTags?: { event?: string } } } | undefined)?.data
          ?.googleTags;
        if (tags?.event === 'addToCart') return;
        const text =
          typeof message === 'object' && message !== null
            ? (message as { title?: string; text?: string }).title ||
              (message as { title?: string; text?: string }).text ||
              ''
            : String(message ?? '');
        showToast(text, type);
      });

    void (async () => {
      try {
        await sdk()?.onReady?.();
      } catch {
        /* onReady may fail during partial initialization */
      }
      later(() => {
        if (alive) install();
      }, 0);
    })();

    return () => {
      alive = false;
      onToast(null);
      timers.forEach(clearTimeout);
    };
  }, []);

  return (
    <div id="toasts" className="toast-wrap az" aria-live="polite">
      {items.map((t) => (
        <div
          key={t.id}
          className={`toast${t.isError ? ' is-error' : ''}${t.out ? ' out' : ''}`}
          role={t.isError ? 'alert' : 'status'}
        >
          <Icon name={t.isError ? 'info' : 'check'} className="i-sm" />
          <span>{t.message}</span>
        </div>
      ))}
    </div>
  );
}
