import { Paginated } from '@/components/ui/Paginated';
import { ExternalLink } from 'lucide-react';
import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApiQuery } from '@/api/hooks';
import type { Application } from '@/api/endpoints/applications';
import { CandidatePhoto } from '@/components/ui/Avatar';
import { ScoreRing, StageBadge } from '@/components/ui/Badges';
import { EmptyState } from '@/components/ui/EmptyState';
import { Drawer } from '@/components/ui/Modal';
import { Skeleton } from '@/components/ui/Skeleton';
import { STAGES, STAGE_PROB, isTerminalStage, money, stageKind } from '@/lib/format';

const DAY = 864e5;
const fmt = (d: string) => new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
const feeOf = (a: Application) => (a.job?.client?.feePct != null ? +(((a.candidate.expected || 0) * a.job.client.feePct) / 100).toFixed(2) : null);

interface JobRow {
  id: string;
  title: string;
  city?: string;
  remote?: boolean;
  openings: number;
  daysOpen: number;
  pipelineCount: number;
  priority: string;
  client?: { name: string };
}
interface CandRow {
  id: string;
  name: string;
  title?: string;
  city?: string;
  exp?: number;
  expected?: number;
  source?: string;
  pipelines?: number;
  photoAt?: string | null;
}

const Person = ({ c, sub }: { c: { id: string; name: string; photoAt?: string | null }; sub?: string }) => (
  <div className="who">
    <CandidatePhoto c={c} size={34} />
    <div>
      <b>{c.name}</b>
      <span>{sub}</span>
    </div>
  </div>
);

interface Def {
  loading: boolean;
  title: string;
  link?: [string, string];
  rows: { key: string; go: string; [k: string]: unknown }[];
  summary: (rows: Def['rows']) => string;
  cols: [string, (r: never) => ReactNode][];
}

function useDef(kind: string, arg?: string): Def {
  const needApps = kind !== 'jobs' && kind !== 'source';
  const apps = useApiQuery<Application[]>('/applications', undefined, { enabled: needApps });
  const jobs = useApiQuery<JobRow[]>('/jobs', { status: 'open' }, { enabled: kind === 'jobs' });
  const cands = useApiQuery<CandRow[]>('/candidates', undefined, { enabled: kind === 'source' });
  const A = apps.data ?? [];
  const loading = kind === 'jobs' ? !jobs.data : kind === 'source' ? !cands.data : !apps.data;
  const active = A.filter((a) => !isTerminalStage(a.stage));
  const appRow = (a: Application) => ({ go: '/candidates/' + a.candidate.id, key: a.id });
  const stageCols: Def['cols'] = [
    ['Candidate', (a: Application) => <Person c={a.candidate} sub={a.job.title} />],
    ['Client', (a: Application) => a.job.client?.name],
    ['Stage', (a: Application) => <StageBadge stage={a.stage} />],
    ['Match', (a: Application) => <ScoreRing score={a.score} size={36} />],
    ['In stage', (a: Application) => a.daysInStage + 'd'],
  ] as Def['cols'];
  const empty: Def = { loading: false, title: '', rows: [], cols: [], summary: () => '' };

  if (kind === 'jobs')
    return {
      loading,
      title: 'Open jobs',
      link: ['/jobs', 'Open Jobs page'],
      rows: (jobs.data ?? []).map((j) => ({ ...j, go: '/jobs/' + j.id, key: j.id })),
      summary: (r) => `${r.length} open job${r.length === 1 ? '' : 's'} · ${(r as unknown as JobRow[]).reduce((t, j) => t + j.openings, 0)} openings`,
      cols: [
        ['Role', (j: JobRow) => (<div><b>{j.title}</b><div style={{ color: 'var(--muted)', fontSize: 12.5 }}>{j.client?.name}</div></div>)],
        ['Location', (j: JobRow) => j.city + (j.remote ? ' · Remote OK' : '')],
        ['Openings', (j: JobRow) => j.openings],
        ['Open for', (j: JobRow) => j.daysOpen + 'd'],
        ['In pipeline', (j: JobRow) => j.pipelineCount],
        ['Priority', (j: JobRow) => <span className={'badge ' + (j.priority === 'High' ? 'bad' : j.priority === 'Medium' ? 'warn' : '')}>{j.priority}</span>],
      ] as Def['cols'],
    };
  if (kind === 'active')
    return {
      loading,
      title: 'Active pipeline',
      link: ['/pipeline', 'Open Pipeline board'],
      rows: [...active].sort((a, b) => STAGES.indexOf(b.stage) - STAGES.indexOf(a.stage)).map((a) => ({ ...a, ...appRow(a) })),
      summary: (r) => `${r.length} candidates in progress across ${new Set((r as unknown as Application[]).map((a) => a.job.id)).size} jobs`,
      cols: stageCols,
    };
  if (kind === 'stage') {
    const i = STAGES.indexOf(arg ?? '');
    const rows = A.filter((a) => stageKind(a.stage) !== 'rejected' && STAGES.indexOf(a.stage) >= i);
    return { loading, title: `Reached ${arg}`, link: ['/pipeline', 'Open Pipeline board'], rows: rows.map((a) => ({ ...a, ...appRow(a) })), summary: (r) => `${r.length} candidates reached ${arg} or beyond`, cols: stageCols };
  }
  if (kind === 'placed' || kind === 'ttf') {
    const rows = A.filter((a) => stageKind(a.stage) === 'placed').map((a) => ({
      ...a,
      ...appRow(a),
      days: Math.max(0, Math.round((new Date(a.stageChangedAt).getTime() - new Date(a.job.openedAt ?? a.stageChangedAt).getTime()) / DAY)),
      fee: feeOf(a),
    }));
    type P = (typeof rows)[number];
    return {
      loading,
      title: kind === 'ttf' ? 'Time to fill' : 'Placements',
      link: ['/pipeline', 'Open Pipeline board'],
      rows,
      summary: (r) => {
        const p = r as unknown as P[];
        return kind === 'ttf'
          ? `Average ${p.length ? Math.round(p.reduce((t, a) => t + a.days, 0) / p.length) : 0} days from job opened to placed`
          : `${p.length} placement${p.length === 1 ? '' : 's'}${p[0]?.fee != null ? ' · ' + money(p.reduce((t, a) => t + (a.fee ?? 0), 0)) + ' billed' : ''}`;
      },
      cols: [
        ['Candidate', (a: P) => <Person c={a.candidate} sub={a.job.title} />],
        ['Client', (a: P) => a.job.client?.name],
        ['Placed on', (a: P) => fmt(a.stageChangedAt)],
        ['Days to fill', (a: P) => a.days + 'd'],
        ...(rows[0]?.fee != null ? [['Fee', (a: P) => <b>{money(a.fee)}</b>]] : []),
      ] as Def['cols'],
    };
  }
  if (kind === 'forecast') {
    const rows = active
      .map((a) => ({ ...a, ...appRow(a), prob: STAGE_PROB[a.stage] ?? 0, fee: feeOf(a) }))
      .filter((a) => a.fee != null)
      .map((a) => ({ ...a, exp: (a.fee ?? 0) * a.prob }))
      .sort((x, y) => y.exp - x.exp);
    type P = (typeof rows)[number];
    return {
      loading,
      title: 'Weighted forecast',
      link: ['/pipeline', 'Open Pipeline board'],
      rows,
      summary: (r) => `${money((r as unknown as P[]).reduce((t, a) => t + a.exp, 0))} expected from ${r.length} open applications (fee × stage probability)`,
      cols: [
        ['Candidate', (a: P) => <Person c={a.candidate} sub={a.job.title} />],
        ['Stage', (a: P) => <StageBadge stage={a.stage} />],
        ['Probability', (a: P) => Math.round(a.prob * 100) + '%'],
        ['Fee if placed', (a: P) => money(a.fee)],
        ['Expected', (a: P) => <b>{money(a.exp)}</b>],
      ] as Def['cols'],
    };
  }
  if (kind === 'source') {
    const rows = (cands.data ?? []).filter((c) => (c.source || 'Direct') === arg).map((c) => ({ ...c, go: '/candidates/' + c.id, key: c.id }));
    return {
      loading,
      title: `Candidates from ${arg}`,
      link: ['/candidates', 'Open Talent pool'],
      rows,
      summary: (r) => `${r.length} candidates sourced via ${arg}`,
      cols: [
        ['Candidate', (c: CandRow) => <Person c={c} sub={c.title} />],
        ['City', (c: CandRow) => c.city],
        ['Experience', (c: CandRow) => c.exp + ' yrs'],
        ['Expected CTC', (c: CandRow) => money(c.expected)],
        ['Pipelines', (c: CandRow) => c.pipelines || '—'],
      ] as Def['cols'],
    };
  }
  return empty;
}

/** Drawer listing the records behind a dashboard KPI, chart bar or pie slice. */
export function DrillDown({ kind, arg, onClose }: { kind: string; arg?: string; onClose: () => void }) {
  const nav = useNavigate();
  const d = useDef(kind, arg);
  const go = (p: string) => {
    onClose();
    nav(p);
  };
  return (
    <Drawer
      width={780}
      onClose={onClose}
      header={
        <>
          <b style={{ fontSize: 18 }}>{d.title}</b>
          {!d.loading && <div style={{ color: 'var(--text2)', fontSize: 13, marginTop: 2 }}>{d.summary(d.rows)}</div>}
        </>
      }
    >
      {d.loading ? (
        <Skeleton rows={7} />
      ) : !d.rows.length ? (
        <EmptyState title="Nothing here yet" sub="No records match this metric." />
      ) : (
        <>
          <Paginated items={d.rows} render={(pageRows) => (
          <table className="table" style={{ marginTop: -4 }}>
            <thead>
              <tr>
                {d.cols.map(([h]) => (
                  <th key={h}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pageRows.map((r) => (
                <tr key={r.key} className="click" onClick={() => go(r.go)}>
                  {d.cols.map(([h, f]) => (
                    <td key={h}>{f(r as never)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          )} />
          {d.link && (
            <button className="btn" style={{ marginTop: 18 }} onClick={() => go(d.link![0])}>
              <ExternalLink size={15} />
              {d.link[1]}
            </button>
          )}
        </>
      )}
    </Drawer>
  );
}
