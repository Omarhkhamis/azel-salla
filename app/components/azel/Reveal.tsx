import { useEffect, useRef, useState, type ElementType, type HTMLAttributes, type ReactNode } from 'react';

/** Scroll reveal: `.reveal` gains `.in` the first time it comes into view. */
export function Reveal({
  as: Tag = 'div',
  className = '',
  children,
  ...rest
}: { as?: ElementType; className?: string; children?: ReactNode } & HTMLAttributes<HTMLElement>) {
  const ref = useRef<HTMLElement>(null);
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === 'undefined') {
      setShown(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setShown(true);
          io.disconnect();
        }
      },
      { threshold: 0.12 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <Tag ref={ref} className={`reveal${shown ? ' in' : ''} ${className}`.trim()} {...rest}>
      {children}
    </Tag>
  );
}
