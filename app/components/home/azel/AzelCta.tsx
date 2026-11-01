import { memo } from 'react';
import { AzLink } from '../../azel/AzLink';
import { Reveal } from '../../azel/Reveal';
import { linkUrl } from '../../../lib/azel/utils';
import type { BlockProps } from './types';

/** `home.azel-cta`: the green call-to-action band. */
export const AzelCta = memo(function AzelCta({
  data,
}: BlockProps<{
  eyebrow?: string;
  title?: string;
  text?: string;
  btn1_text?: string;
  btn1_url?: unknown;
  btn2_text?: string;
  btn2_url?: unknown;
}>) {
  return (
    <section className="section az">
      <div className="container">
        <Reveal className="cta-band">
          <div>
            {data.eyebrow && <span className="eyebrow">{data.eyebrow}</span>}
            {data.title && <h2>{data.title}</h2>}
            {data.text && <p>{data.text}</p>}
          </div>
          {(data.btn1_text || data.btn2_text) && (
            <div className="cta-actions">
              {data.btn1_text && (
                <AzLink href={linkUrl(data.btn1_url)} className="btn btn-lime btn-lg">
                  {data.btn1_text}
                </AzLink>
              )}
              {data.btn2_text && (
                <AzLink href={linkUrl(data.btn2_url)} className="btn btn-ghost-light btn-lg">
                  {data.btn2_text}
                </AzLink>
              )}
            </div>
          )}
        </Reveal>
      </div>
    </section>
  );
});
