import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createElement, useRef } from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react';
import { TintPickers } from '../../../app/components/product/TintPickers';

vi.mock('@salla.sa/twilight-theme-engine/i18n', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
vi.mock('@salla.sa/twilight-theme-engine/providers', () => ({
  // No grade settings: the three default grades 00 / 01 / 02.
  useTwilight: () => ({ theme: { settings: {} } }),
}));

/** One option the way <salla-product-options> renders it in grid mode. */
function option(id: number, name: string, values: string[], required = true) {
  const inputs = values
    .map(
      (v, i) =>
        `<label><input type="radio" name="options[${id}]" value="${id}${i}"${required ? ' required' : ''}><div>${v}</div></label>`
    )
    .join('');
  return `<div class="s-product-options-option-container" data-option-id="${id}">
    <div class="s-product-options-option" data-option-required="${required}">
      <label class="s-product-options-option-label"><b>${name} <span>*</span></b></label>
      <div class="s-product-options-grid-mode">${inputs}</div>
    </div>
  </div>`;
}

function Harness({ markup }: { markup: string }) {
  const ref = useRef<HTMLFormElement>(null);
  return (
    <form ref={ref}>
      <TintPickers formRef={ref} />
      {createElement('salla-product-options', { dangerouslySetInnerHTML: { __html: markup } })}
    </form>
  );
}

const ZONES =
  option(1, 'الزجاج الأمامي', ['00', '01', '02']) +
  option(2, 'الجوانب الأمامية', ['00', '01', '02']) +
  option(3, 'الجوانب الخلفية', ['00', '01', '02']) +
  option(4, 'الزجاج الخلفي', ['00', '01', '02']);

const checked = (c: HTMLElement, id: number) =>
  (c.querySelector(`input[name="options[${id}]"]:checked`) as HTMLInputElement | null)?.value;

beforeEach(() => window.history.replaceState(null, '', '/'));

describe('TintPickers — per zone', () => {
  it('mirrors two or more grade options into zone rows and hides Salla’s rows', async () => {
    const { container } = render(<Harness markup={ZONES} />);
    await waitFor(() => expect(container.querySelectorAll('.zone-row')).toHaveLength(4));
    expect(container.querySelector<HTMLElement>('#opt-zones')!.hidden).toBe(false);
    expect(container.querySelector<HTMLElement>('#opt-grade')!.hidden).toBe(true);
    expect(container.querySelectorAll('.az-mirrored')).toHaveLength(4);
    expect(container.querySelector('.zone-name')?.textContent).toContain('الزجاج الأمامي');
  });

  it('places each option on its glass of the car diagram from its name', async () => {
    const { container } = render(<Harness markup={option(5, 'Rear window', ['00', '01']) + option(6, 'Front side', ['00', '01'])} />);
    await waitFor(() => expect(container.querySelectorAll('.zone-row')).toHaveLength(2));
    const shown = [...container.querySelectorAll<SVGGElement>('.car-diagram [data-zone]')]
      .filter((g) => g.style.display !== 'none')
      .map((g) => g.dataset.zone);
    expect(shown.sort()).toEqual(['fside', 'rear']);
  });

  it('clicks Salla’s own input when a zone button is picked', async () => {
    const { container } = render(<Harness markup={ZONES} />);
    await waitFor(() => expect(container.querySelectorAll('.zone-btn')).toHaveLength(12));
    fireEvent.click(container.querySelectorAll('.zone-row')[0].querySelectorAll('.zone-btn')[2]);
    expect(checked(container, 1)).toBe('12');
    await waitFor(() => expect(container.querySelector('.zone-row.done')).toBeTruthy());
    expect(container.querySelector('.zone-row .zone-btn.active b')?.textContent).toBe('02');
  });

  it('sets every zone at once from «نفس الدرجة للكل»', async () => {
    const { container } = render(<Harness markup={ZONES} />);
    await waitFor(() => expect(container.querySelectorAll('.zone-row')).toHaveLength(4));
    expect(container.querySelectorAll('#zone-all button')).toHaveLength(3);
    fireEvent.click(container.querySelectorAll('#zone-all button')[1]);
    expect([1, 2, 3, 4].map((id) => checked(container, id))).toEqual(['11', '21', '31', '41']);
    await waitFor(() => expect(container.querySelector('#zone-all button.active')?.textContent).toBe('01'));
  });

  it('preselects the grade passed as ?grade= from the hero card', async () => {
    window.history.replaceState(null, '', '/?grade=02');
    const { container } = render(<Harness markup={ZONES} />);
    await waitFor(() => expect(checked(container, 4)).toBe('42'));
    expect([1, 2, 3].map((id) => checked(container, id))).toEqual(['12', '22', '32']);
  });

  it('shows the design error instead of a native bubble for a missing zone', async () => {
    const { container } = render(<Harness markup={ZONES} />);
    await waitFor(() => expect(container.querySelectorAll('.zone-row')).toHaveLength(4));
    const input = container.querySelector('input[name="options[3]"]')!;
    const event = new Event('invalid', { cancelable: true });
    input.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
    await waitFor(() => expect(container.querySelector<HTMLElement>('#zone-err')!.hidden).toBe(false));
    expect(container.querySelectorAll('.zone-row.missing')).toHaveLength(1);
  });
});

describe('TintPickers — a single grade option', () => {
  it('shows the swatch cards with the picked grade’s description', async () => {
    const { container } = render(<Harness markup={option(9, 'درجة العازل', ['00', '01', '02'])} />);
    await waitFor(() => expect(container.querySelectorAll('#opt-grade .grade')).toHaveLength(3));
    expect(container.querySelector<HTMLElement>('#opt-zones')!.hidden).toBe(true);
    expect(container.querySelector('.ol-t')?.textContent).toBe('درجة العازل');
    fireEvent.click(container.querySelectorAll('#opt-grade .grade')[0]);
    expect(checked(container, 9)).toBe('90');
    await waitFor(() =>
      expect(container.querySelector('.grade-desc')?.textContent).toContain('تظليل خفيف')
    );
  });
});

describe('TintPickers — other options', () => {
  it('leaves an option whose values are not grades to Salla', async () => {
    const { container } = render(<Harness markup={option(7, 'اللون', ['أحمر', 'أسود'])} />);
    await new Promise((r) => setTimeout(r, 50));
    expect(container.querySelector('.az-mirrored')).toBeNull();
    expect(container.querySelector<HTMLElement>('#opt-zones')!.hidden).toBe(true);
    expect(container.querySelector<HTMLElement>('#opt-grade')!.hidden).toBe(true);
  });

  it('shows the general options error for a missing option it does not mirror', async () => {
    const { container } = render(<Harness markup={option(7, 'اللون', ['أحمر', 'أسود'])} />);
    container.querySelector('input[name="options[7]"]')!.dispatchEvent(new Event('invalid', { cancelable: true }));
    await waitFor(() => expect(container.querySelector<HTMLElement>('#opt-err')!.hidden).toBe(false));
  });
});
