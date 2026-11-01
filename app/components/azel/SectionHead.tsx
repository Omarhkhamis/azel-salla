import { Icon } from './Icon';
import { AzLink } from './AzLink';
import { linkUrl } from '../../lib/azel/utils';

interface SectionHeadProps {
  eyebrow?: string;
  title?: string;
  subtitle?: string;
  linkText?: string;
  linkHref?: unknown;
}

/** The section head with the optional «all products» link at its end. */
export function SectionHead({ eyebrow, title, subtitle, linkText, linkHref }: SectionHeadProps) {
  return (
    <div className="section-head">
      <div>
        {eyebrow && <span className="eyebrow">{eyebrow}</span>}
        {title && <h2 className="section-title">{title}</h2>}
        {subtitle && <p className="section-sub">{subtitle}</p>}
      </div>
      {linkText && (
        <AzLink href={linkUrl(linkHref)} className="link">
          {linkText} <Icon name="arrowL" className="i-sm i-flip" />
        </AzLink>
      )}
    </div>
  );
}
