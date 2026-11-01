import type { ReactNode } from 'react';
import { useTranslation } from '@salla.sa/twilight-theme-engine/i18n';
import { showToast } from '../../lib/azel/toast';

/** Copies a coupon code and says so. */
export function CopyButton({
  code,
  className,
  label,
  children,
}: {
  code: string;
  className?: string;
  label?: string;
  children: ReactNode;
}) {
  const { t } = useTranslation();
  const copy = () => {
    const done = () => showToast(t('azel.common.copied').replace(':code', code));
    if (navigator.clipboard?.writeText) navigator.clipboard.writeText(code).then(done, done);
    else done();
  };
  return (
    <button type="button" className={className} aria-label={label} onClick={copy}>
      {children}
    </button>
  );
}
