import { Construction } from 'lucide-react';
import { PageHead } from './ui/Layout';

/** Stand-in for a route whose feature has not been ported yet. Replace the page in src/pages/ with the real feature screen. */
export function PagePlaceholder({ title, area, note }: { title: string; area: string; note?: string }) {
  return (
    <>
      <PageHead title={title} sub="This screen has not been ported to the new frontend yet" />
      <div className="card">
        <div className="empty">
          <Construction size={34} strokeWidth={1.5} />
          <b>{title} is coming soon</b>
          {note ?? `To be ported into src/features/${area}/`}
        </div>
      </div>
    </>
  );
}
