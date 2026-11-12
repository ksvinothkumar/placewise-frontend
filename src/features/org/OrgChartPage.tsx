import { useQuery } from '@tanstack/react-query';
import { GitBranch, List, Minus, Plus, Search, Users } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { usersApi, type OrgMember } from '@/api/endpoints/users';
import { queryKeys } from '@/api/queryKeys';
import { CandidatePhoto } from '@/components/ui/Avatar';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageHead } from '@/components/ui/Layout';
import { Skeleton } from '@/components/ui/Skeleton';
import { Tabs } from '@/components/ui/Tabs';
import { useCan } from '@/lib/permissions';
import { roleLabel } from '@/lib/format';
import { useSessionStore } from '@/stores/session.store';
import { buildForest, countAll, flatten, type OrgNode } from './orgTree';

const VIEWS = [['tree', 'Tree View'], ['list', 'Workflow View']] as const;
type View = (typeof VIEWS)[number][0];

const haystack = (m: OrgMember) => `${m.name} ${m.email} ${m.title ?? ''} ${roleLabel(m.role)}`.toLowerCase();

/** Who reports to whom, drawn from the reporting managers set on the Team page. */
export function OrgChartPage() {
  const me = useSessionStore((s) => s.user);
  const canMap = useCan('users:manage');
  const [view, setView] = useState<View>('tree');
  const [q, setQ] = useState('');
  const [folded, setFolded] = useState<Set<string>>(new Set());
  const { data, isLoading, isError } = useQuery({ queryKey: [...queryKeys.users.all, 'org'], queryFn: usersApi.org });
  const forest = useMemo(() => buildForest(data ?? []), [data]);
  const needle = q.trim().toLowerCase();
  const hits = useMemo(() => new Set((data ?? []).filter((m) => needle && haystack(m).includes(needle)).map((m) => m.id)), [data, needle]);
  const nameOf = (id: string | null) => data?.find((m) => m.id === id)?.name;
  const toggle = (id: string) => setFolded((s) => ((n) => (n.has(id) ? n.delete(id) : n.add(id), n))(new Set(s)));

  const card = (n: OrgNode) => {
    const m = n.m;
    const dim = !!needle && !hits.has(m.id);
    const open = !folded.has(m.id) || !!needle;
    return (
      <>
        <div className={'org-card' + (hits.has(m.id) ? ' hit' : '') + (dim ? ' dim' : '')} title={m.email}>
          <div className="org-av">
            <CandidatePhoto c={m} size={40} path={m.id === me?.id ? '/auth/photo' : undefined} />
            <i className="org-dot" aria-label="Active" />
          </div>
          <b>{m.name}</b>
          <span>{roleLabel(m.role)}</span>
          {m.title && <small>{m.title}</small>}
          {n.kids.length > 0 && (
            <button type="button" className="org-fold" aria-expanded={open} aria-label={`${open ? 'Hide' : 'Show'} ${m.name}'s reports`} onClick={() => toggle(m.id)}>
              {open ? <Minus size={11} /> : <Plus size={11} />}{countAll(n)}
            </button>
          )}
        </div>
        {n.kids.length > 0 && open && <ul>{n.kids.map((k) => <li key={k.m.id}>{card(k)}</li>)}</ul>}
      </>
    );
  };

  const rows = flatten(forest).filter(({ node }) => !needle || hits.has(node.m.id));
  return (
    <>
      <PageHead title="Org chart" sub="Who reports to whom">
        {canMap && <Link className="btn" to="/users"><Users size={16} />Edit reporting lines</Link>}
      </PageHead>
      <div className="toolbar" style={{ marginBottom: 14, gap: 12 }}>
        <div className="search" style={{ minWidth: 280 }}>
          <Search size={16} />
          <input className="input" placeholder="Search by name, email, or department" aria-label="Search the org chart" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <Tabs tabs={VIEWS} value={view} onChange={setView} />
        {needle && <span style={{ color: 'var(--muted)' }}>{hits.size} match{hits.size === 1 ? '' : 'es'}</span>}
      </div>
      {isLoading && !data ? (
        <div className="card"><Skeleton rows={6} /></div>
      ) : !data?.length ? (
        <div className="card"><EmptyState icon={GitBranch} title={isError ? 'Could not load the org chart' : 'No team members yet'} /></div>
      ) : view === 'tree' ? (
        <div className="card org-wrap">
          <ul className="org org-roots">{forest.map((r) => <li key={r.m.id}>{card(r)}</li>)}</ul>
          {!data.some((m) => m.manager) && canMap && (
            <p style={{ textAlign: 'center', color: 'var(--muted)', margin: '18px 0 0' }}>
              Nobody reports to anyone yet. Set a <Link to="/users">reporting manager</Link> for each person to build the chart.
            </p>
          )}
        </div>
      ) : (
        <div className="card" style={{ overflowX: 'auto' }}>
          <table className="table">
            <thead><tr><th className="sn">#</th><th>Person</th><th>Role</th><th>Reports to</th><th style={{ width: 120 }}>Direct reports</th></tr></thead>
            <tbody>
              {rows.map(({ node, depth }, n) => (
                <tr key={node.m.id}><td className="sn">{n + 1}</td>
                  <td>
                    <div className="who" style={{ paddingLeft: depth * 24 }}>
                      <CandidatePhoto c={node.m} size={32} path={node.m.id === me?.id ? '/auth/photo' : undefined} />
                      <div><b>{node.m.name}</b><span>{node.m.title || node.m.email}</span></div>
                    </div>
                  </td>
                  <td>{roleLabel(node.m.role)}</td>
                  <td style={{ color: 'var(--text2)' }}>{nameOf(node.m.manager) ?? '—'}</td>
                  <td>{node.kids.length || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!rows.length && <EmptyState icon={List} title="Nobody matches that search" />}
        </div>
      )}
    </>
  );
}
