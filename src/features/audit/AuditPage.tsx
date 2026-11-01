import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { Download, ScrollText, Search } from 'lucide-react';
import { useEffect, useState } from 'react';
import { auditApi } from '@/api/endpoints/audit';
import { queryKeys } from '@/api/queryKeys';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageHead } from '@/components/ui/Layout';
import { Skeleton } from '@/components/ui/Skeleton';
import { downloadCsv } from '@/lib/downloadCsv';
import { roleLabel } from '@/lib/format';

/** Debounce typing so each keystroke does not hit the server. */
function useDebounced<T>(value: T, ms = 300): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

const when = (d: string) => new Date(d).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', second: '2-digit' });

export function AuditPage() {
  const [f, setF] = useState({ q: '', entity: '', page: 1 });
  const q = useDebounced(f.q);
  const { data, isLoading, isError } = useQuery({
    queryKey: [...queryKeys.audit.all, { q, entity: f.entity, page: f.page }],
    queryFn: ({ signal }) => auditApi.list({ q, entity: f.entity, page: f.page }, signal),
    placeholderData: keepPreviousData,
  });

  const csv = () =>
    downloadCsv('audit-log.csv', [
      ['Time', 'User', 'Role', 'Action', 'Entity', 'ID', 'Path', 'Status', 'IP', 'Browser', 'OS', 'Device', 'Location'],
      ...(data?.items ?? []).map((a) => [a.createdAt, a.userName, a.role, a.action, a.entity, a.entityId, a.path, a.status, a.ip, a.browser, a.os, a.device, a.location]),
    ]);

  return (
    <>
      <PageHead title="Audit log" sub="Who changed what, and when. Admin only.">
        <button type="button" className="btn" onClick={csv} disabled={!data?.items?.length}><Download size={16} />Export page</button>
      </PageHead>
      <div className="card">
        <div className="toolbar">
          <div className="search">
            <Search size={16} />
            <input className="input" placeholder="Search user, path, browser, location…" aria-label="Search audit log" value={f.q} onChange={(e) => setF({ ...f, q: e.target.value, page: 1 })} />
          </div>
          <select className="select" aria-label="Area" value={f.entity} onChange={(e) => setF({ ...f, entity: e.target.value, page: 1 })}>
            <option value="">All areas</option>
            {(data?.entities ?? []).map((e) => <option key={e}>{e}</option>)}
          </select>
          <span style={{ marginLeft: 'auto', color: 'var(--muted)' }}>{data?.total ?? '…'} events</span>
        </div>
        {isLoading && !data ? (
          <Skeleton rows={8} />
        ) : data?.items?.length ? (
          <table className="table">
            <thead><tr><th>When</th><th>User</th><th>Action</th><th>Area</th><th>Path</th><th>Browser</th><th>Location</th><th>Result</th></tr></thead>
            <tbody>
              {data.items.map((a) => (
                <tr key={a.id}>
                  <td style={{ whiteSpace: 'nowrap', color: 'var(--text2)' }}>{when(a.createdAt)}</td>
                  <td><b>{a.userName || '—'}</b> {a.role && <span className="badge" style={{ marginLeft: 4 }}>{roleLabel(a.role)}</span>}</td>
                  <td><code>{a.action}</code></td>
                  <td>{a.entity}</td>
                  <td style={{ color: 'var(--muted)', fontSize: 12.5, maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={a.path}>{a.path}</td>
                  <td style={{ whiteSpace: 'nowrap' }} title={a.ip}>
                    {a.browser ? <>{a.browser}<div style={{ color: 'var(--muted)', fontSize: 12 }}>{[a.os, a.device].filter(Boolean).join(' · ')}</div></> : <span style={{ color: 'var(--muted)' }}>—</span>}
                  </td>
                  <td style={{ whiteSpace: 'nowrap' }} title={a.ip}>{a.location || <span style={{ color: 'var(--muted)' }}>—</span>}</td>
                  <td><span className={'badge ' + (a.status >= 400 ? 'bad' : 'good')}>{a.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <EmptyState icon={ScrollText} title={isError ? 'Could not load the audit log' : 'No matching events'} />
        )}
        {data && data.pages > 1 && (
          <div className="toolbar" style={{ borderTop: '1px solid var(--line)', borderBottom: 0, justifyContent: 'center' }}>
            <button type="button" className="btn sm" disabled={f.page <= 1} onClick={() => setF({ ...f, page: f.page - 1 })}>Previous</button>
            <span style={{ color: 'var(--text2)' }}>Page {data.page} of {data.pages}</span>
            <button type="button" className="btn sm" disabled={f.page >= data.pages} onClick={() => setF({ ...f, page: f.page + 1 })}>Next</button>
          </div>
        )}
      </div>
    </>
  );
}
