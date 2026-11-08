import { useMemo, type ReactNode } from 'react';
import { SallaComments } from '@salla.sa/twilight-components-react/comments';
import type { StaticPage } from '@salla.sa/twilight-theme-engine/routes/page';
import { Breadcrumb } from '@salla.sa/twilight-theme-engine/common';
import { HookSlot } from '@salla.sa/twilight-theme-engine/hooks';
import { useComments } from '@salla.sa/twilight-theme-engine/hooks/useComments';
import { stripUnsafeHtml } from '@salla.sa/twilight-theme-engine/utils';
import { BlockHookSlot } from '../common';

/** Engine `StaticPage` plus the `type` our forked loader threads through. */
export type PageWithType = StaticPage & { type?: string };

export interface PageSingleProps {
  page: PageWithType;
}

/**
 * The hook points partner apps inject into, around every kind of info page:
 * `page-single:start` / `page-single:end` (the `<page-slug>:start` / `.end` pair the
 * engine's Twig mapping gives a page, with the page as context) and the classic
 * `information_page.information_page` block hook with the page's merchant blocks.
 */
function PageSlots({ page, children }: { page: PageWithType; children?: ReactNode }) {
  const context = { page };
  return (
    <>
      <HookSlot name="page-single:start" context={context} />
      <BlockHookSlot
        name="information_page.information_page"
        wrapper="s-information-page"
        className="!mt-0"
        scope={page.id != null ? { page_id: page.id } : undefined}
      />
      {children}
      <HookSlot name="page-single:end" context={context} />
    </>
  );
}

/**
 * Info pages, written as HTML in the Salla dashboard (rendered by
 * `app/routes/$slug.page-$id.tsx`):
 *   - a `customised` page is the app-injected block alone
 *   - content with its own `<section>`s (e.g. the install-centers page pasted from
 *     the design, using its classes) prints full width: the page owns its layout
 *   - plain text content (policies, about…) gets the design's dark page head and a
 *     white prose card
 * Every kind keeps the same hook points (`PageSlots`).
 */
export function PageSingle({ page }: PageSingleProps) {
  const { commentsKey } = useComments();

  const content = useMemo(() => stripUnsafeHtml(page.content ?? ''), [page.content]);

  if (page.type === 'customised') {
    return <PageSlots page={page} />;
  }

  if (content.includes('<section')) {
    return (
      <PageSlots page={page}>
        <div className="az azel-html-page" dangerouslySetInnerHTML={{ __html: content }} />
      </PageSlots>
    );
  }

  return (
    <PageSlots page={page}>
      <section className="page-hero az">
        <div className="container">
          <Breadcrumb page={page} className="crumbs" />
          <h1>{page.title}</h1>
        </div>
      </section>
      <section className="section-sm az">
        <div className="container info-wrap">
          <div className="policy-body">
            <div className="prose content-entry" dangerouslySetInnerHTML={{ __html: content }} />
          </div>
          {page.id != null && (
            <div className="info-comments">
              <SallaComments key={commentsKey} itemId={Number(page.id)} type={'page' as never} />
            </div>
          )}
        </div>
      </section>
    </PageSlots>
  );
}
