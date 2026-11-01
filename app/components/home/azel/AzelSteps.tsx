import { memo } from 'react';
import { Icon } from '../../azel/Icon';
import { Reveal } from '../../azel/Reveal';
import { collection, pick } from '../../../lib/azel/utils';
import type { BlockProps } from './types';

/** `home.azel-steps`: numbered steps with an icon each. */
export const AzelSteps = memo(function AzelSteps({
  data,
}: BlockProps<{ eyebrow?: string; title?: string; subtitle?: string; steps?: unknown }>) {
  const steps = collection<{ icon?: unknown; title?: string; text?: string }>(data.steps, 'steps');
  return (
    <section className="section az">
      <div className="container">
        <div className="section-head center">
          {data.eyebrow && <span className="eyebrow">{data.eyebrow}</span>}
          {data.title && <h2 className="section-title">{data.title}</h2>}
          {data.subtitle && <p className="section-sub">{data.subtitle}</p>}
        </div>
        <div className="steps">
          {steps.map((step, i) => (
            <Reveal key={i} className="step">
              <span className="ico">
                <Icon name={pick(step.icon) || 'sun'} />
              </span>
              <h3>{step.title}</h3>
              {step.text && <p>{step.text}</p>}
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
});
