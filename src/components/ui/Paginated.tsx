import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';

export const PAGE_SIZES = [10, 25, 50, 100] as const;

interface Props<T> {
  items: T[];
  /** Renders the table for the current page of rows. */
  render: (rows: T[]) => ReactNode;
  initialSize?: number;
}

/** Client-side pagination around a table: page buttons, rows-per-page and a "1–10 of 42" label. Hidden when everything fits the smallest page size. */
export function Paginated<T>({ items, render, initialSize = 10 }: Props<T>) {
  const [size, setSize] = useState<number>(initialSize);
  const [page, setPage] = useState(1);
  const pages = Math.max(1, Math.ceil(items.length / size));
  const current = Math.min(page, pages);
  useEffect(() => {
    if (page > pages) setPage(pages);
  }, [page, pages]);

  const from = (current - 1) * size;
  const rows = items.slice(from, from + size);
  return (
    <>
      {render(rows)}
      {items.length > PAGE_SIZES[0] && (
        <nav className="pager" aria-label="Pagination">
          <span className="pager-info">
            {from + 1}–{from + rows.length} of {items.length}
          </span>
          <label className="pager-size">
            Rows
            <select className="select" aria-label="Rows per page" value={size} onChange={(e) => { setSize(Number(e.target.value)); setPage(1); }}>
              {PAGE_SIZES.map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </label>
          <button type="button" className="btn sm" aria-label="Previous page" disabled={current <= 1} onClick={() => setPage(current - 1)}><ChevronLeft size={14} /></button>
          <span className="pager-page">Page {current} of {pages}</span>
          <button type="button" className="btn sm" aria-label="Next page" disabled={current >= pages} onClick={() => setPage(current + 1)}><ChevronRight size={14} /></button>
        </nav>
      )}
    </>
  );
}
