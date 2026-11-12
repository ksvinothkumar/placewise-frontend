import { Paginated } from '@/components/ui/Paginated';
import { useQuery } from '@tanstack/react-query';
import { ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { reportsApi, type DrillData, type DrillKind } from '@/api/endpoints/reports';
import { errorMessage } from '@/api/errors';
import { queryKeys } from '@/api/queryKeys';
import { StageBadge } from '@/components/ui/Badges';
import { Empty } from '@/components/ui/EmptyState';
import { Drawer } from '@/components/ui/Modal';
import { Skeleton } from '@/components/ui/Skeleton';
import { fmtDate, inr } from '@/lib/format';

export interface DrillTarget { kind: DrillKind; arg?: string }

const cell = (v: string | number | null, type: DrillData['columns'][number]['type']) => {
  if (v == null || v === '') return <span style={{ color: 'var(--muted)' }}>—</span>;
  if (type === 'date') return fmtDate(v as string);
  if (type === 'money') return inr(Number(v));
  if (type === 'days') return v + 'd';
  if (type === 'stage') return <StageBadge stage={String(v)} />;
  return v;
};

/** The records behind a card or chart on the Reports page. The server applies the same rules as the figure itself, so the rows always add up. */
export function ReportDrill({ target, from, onClose }: { target: DrillTarget; from: string; onClose: () => void }) {
  const nav = useNavigate();
  const { data, error, isLoading } = useQuery({
    queryKey: [...queryKeys.reports.all, 'drill', target.kind, target.arg ?? '', from.slice(0, 10)],
    queryFn: () => reportsApi.drill(target.kind, target.arg, from),
  });
  return (
    <Drawer onClose={onClose} width={720} header={<div><h3 style={{ margin: 0 }}>{data?.title ?? 'Loading…'}</h3>{data && <small style={{ color: 'var(--muted)' }}>{data.summary}</small>}</div>}>
      {isLoading && <Skeleton rows={6} />}
      {error && <Empty title="Could not load these records" sub={errorMessage(error)} />}
      {data && !data.rows.length && <Empty title="Nothing in this period" sub="Try a longer date range." />}
      {data && data.rows.length > 0 && (
        <Paginated items={data.rows} render={(pageRows, from) => (
        <table className="table">
          <thead><tr><th className="sn">#</th>{data.columns.map((c) => <th key={c.label}>{c.label}</th>)}<th /></tr></thead>
          <tbody>
            {pageRows.map((r, i) => (
              <tr key={i} className={r.go ? 'click' : undefined} onClick={r.go ? () => nav(r.go!) : undefined}><td className="sn">{from + i + 1}</td>
                {r.cells.map((v, j) => <td key={j}>{j === 0 ? <b>{cell(v, data.columns[j]!.type)}</b> : cell(v, data.columns[j]!.type)}</td>)}
                <td>{r.go && <ExternalLink size={14} color="var(--muted)" aria-label="Open" />}</td>
              </tr>
            ))}
          </tbody>
        </table>
        )} />
      )}
    </Drawer>
  );
}
