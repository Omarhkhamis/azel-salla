import { Fragment, memo } from 'react';
import { AzLink } from '../../azel/AzLink';
import { Icon } from '../../azel/Icon';
import { collection, linkUrl } from '../../../lib/azel/utils';
import type { BlockProps } from './types';

/** `home.azel-faq`: the design's accordion. Answers are plain text with their line breaks. */
export const AzelFaq = memo(function AzelFaq({
  data,
}: BlockProps<{
  eyebrow?: string;
  title?: string;
  items?: unknown;
  open_first?: boolean;
  btn_text?: string;
  btn_url?: unknown;
}>) {
  const items = collection<{ question?: string; answer?: string }>(data.items, 'items');
  if (!items.length) return null;
  const firstAsked = items.findIndex((item) => item.question);
  return (
    <section className="section bg-white-az az" id="faq">
      <div className="container">
        <div className="section-head center">
          {data.eyebrow && <span className="eyebrow">{data.eyebrow}</span>}
          {data.title && <h2 className="section-title">{data.title}</h2>}
        </div>
        <div className="faq">
          {items.map(
            (item, i) =>
              item.question && (
                <details key={i} open={i === firstAsked && data.open_first !== false}>
                  <summary>
                    {item.question}
                    <span className="tog">
                      <Icon name="plus" className="i-sm" />
                    </span>
                  </summary>
                  <div className="ans">
                    {String(item.answer ?? '')
                      .split('\n')
                      .map((line, n) => (
                        <Fragment key={n}>
                          {n > 0 && <br />}
                          {line}
                        </Fragment>
                      ))}
                  </div>
                </details>
              )
          )}
        </div>
        {data.btn_text && (
          <div className="section-more">
            <AzLink href={linkUrl(data.btn_url)} className="btn btn-outline">
              {data.btn_text}
            </AzLink>
          </div>
        )}
      </div>
    </section>
  );
});
