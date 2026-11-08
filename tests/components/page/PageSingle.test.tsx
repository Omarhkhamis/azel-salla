import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { PageSingle, type PageWithType } from '../../../app/components/page/PageSingle';

vi.mock('@salla.sa/twilight-components-react/comments', () => ({
  SallaComments: ({ itemId }: { itemId: number }) => <div data-testid="comments" data-id={itemId} />,
}));
vi.mock('@salla.sa/twilight-theme-engine/common', () => ({
  Breadcrumb: () => <nav data-testid="breadcrumb" />,
}));
vi.mock('@salla.sa/twilight-theme-engine/hooks/useComments', () => ({
  useComments: () => ({ commentsKey: 'k' }),
}));
vi.mock('@salla.sa/twilight-theme-engine/hooks', () => ({
  HookSlot: ({ name }: { name: string }) => <i data-testid="slot" data-name={name} />,
}));
vi.mock('../../../app/components/common', () => ({
  BlockHookSlot: ({ name }: { name: string }) => <div data-testid="hook" data-name={name} />,
}));

const page = (overrides: Partial<PageWithType>): PageWithType =>
  ({ id: 7, slug: 'page-single', title: 'About', url: '/about/page-7', ...overrides }) as PageWithType;

describe('PageSingle', () => {
  it('renders only the app hooks on a customised page', () => {
    const { getByTestId, queryByText } = render(
      <PageSingle page={page({ type: 'customised', content: '<p>x</p>' })} />
    );
    expect(getByTestId('hook').dataset.name).toBe('information_page.information_page');
    expect(queryByText('About')).toBeNull();
  });

  it.each([
    ['customised', { type: 'customised' }],
    ['full-width', { content: '<section>x</section>' }],
    ['plain', { content: '<p>x</p>' }],
  ])('keeps the hook points partner apps inject into on a %s page', (_kind, overrides) => {
    const { getAllByTestId, getByTestId } = render(<PageSingle page={page(overrides)} />);
    expect(getAllByTestId('slot').map((el) => el.dataset.name)).toEqual([
      'page-single:start',
      'page-single:end',
    ]);
    expect(getByTestId('hook').dataset.name).toBe('information_page.information_page');
  });

  it('prints content with its own sections full width, without the page head', () => {
    const { container, queryByTestId } = render(
      <PageSingle page={page({ content: '<section class="page-hero"><h1>Centers</h1></section>' })} />
    );
    const root = container.querySelector('.azel-html-page');
    expect(root?.querySelector('section.page-hero h1')?.textContent).toBe('Centers');
    expect(queryByTestId('breadcrumb')).toBeNull();
  });

  it('gives plain content the design head, a prose card and comments', () => {
    const { container, getByTestId } = render(<PageSingle page={page({ content: '<p>Policy</p>' })} />);
    expect(container.querySelector('.page-hero h1')?.textContent).toBe('About');
    expect(container.querySelector('.policy-body .prose')?.innerHTML).toBe('<p>Policy</p>');
    expect(getByTestId('breadcrumb')).toBeTruthy();
    expect(getByTestId('comments').dataset.id).toBe('7');
  });

  it('strips scripts and event handlers from the merchant HTML', () => {
    const { container } = render(
      <PageSingle page={page({ content: '<p onclick="steal()">Hi</p><script>steal()</script>' })} />
    );
    const html = container.querySelector('.prose')?.innerHTML ?? '';
    expect(html).not.toContain('<script');
    expect(html).not.toContain('onclick');
    expect(html).toContain('Hi');
  });
});
