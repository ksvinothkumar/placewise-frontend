import { Paginated } from '@/components/ui/Paginated';
import { useQuery } from '@tanstack/react-query';
import { ExternalLink } from 'lucide-react';
import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { applicationsApi, type Application } from '@/api/endpoints/applications';
import { candidatesApi, type Candidate } from '@/api/endpoints/candidates';
import { jobsApi, type Job } from '@/api/endpoints/jobs';
import { queryKeys } from '@/api/queryKeys';
import { CandidatePhoto, Drawer, Empty, ScoreRing, Skeleton, StageBadge } from '@/components/ui';
import { STAGES, STAGE_PROB, isTerminalStage, money, stageKind } from '@/lib/format';

const DAY = 864e5;
const fmt = (d: string) => new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
const feeOf = (a: Application) =>
  a.job?.client?.feePct != null ? +(((a.candidate.expected || 0) * a.job.client.feePct) / 100).toFixed(2) : null;

export type DrillKind = 'jobs' | 'active' | 'stage' | 'placed' | 'ttf' | 'forecast' | 'source';

interface Def {
  loading: boolean;
  title: string;
  link?: [string, string];
  rows: { key: string; go: string }[];
  summary: (rows: never[]) => string;
  cols: [string, (r: never) => ReactNode][];
}

const Person = ({ c, sub }: { c: { id?: string; name: string; title?: string; photoAt?: string | null }; sub?: ReactNode }) => (
  <div className="who">
    <CandidatePhoto c={c} size={34} />
    <div>
      <b>{c.name}</b>
      <span>{sub ?? c.title}</span>
    </div>
  </div>
);

// Each drill-down = a title, a link to the full page, a data source and a table definition. Only the sources a kind needs are fetched.
function useDef(kind: DrillKind, arg?: string): Def {
  const needApps = kind !== 'jobs' && kind !== 'source';
  const apps = useQuery({ queryKey: queryKeys.applications.list(), queryFn: () => applicationsApi.list(), enabled: needApps });
  const jobs = useQuery({ queryKey: queryKeys.jobs.list({ status: 'open' }), queryFn: () => jobsApi.list('open'), enabled: kind === 'jobs' });
  const cands = useQuery({ queryKey: queryKeys.candidates.list(), queryFn: () => candidatesApi.list({}), enabled: kind === 'source' });
  const loading = kind === 'jobs' ? jobs.isLoading : kind === 'source' ? cands.isLoading : apps.isLoading;
  const A = apps.data ?? [];
  const active = A.filter((a) => !isTerminalStage(a.stage));
  const appRow = (a: Application) => ({ go: '/candidates/' + a.candidate.id, key: a.id });
  const stageCols = [
    ['Candidate', (a: Application) => <Person c={a.candidate} sub={a.job.title} />],
    ['Client', (a: Application) => a.job.client?.name],
    ['Stage', (a: Application) => <StageBadge stage={a.stage} />],
    ['Match', (a: Application) => <ScoreRing score={a.score} size={36} />],
    ['In stage', (a: Application) => a.daysInStage + 'd'],
  ];
  const def = (d: unknown) => d as Def;

  if (kind === 'jobs') {
    const rows = (jobs.data ?? []).map((j) => ({ ...j, go: '/jobs/' + j.id, key: j.id }));
    return def({
      loading,
      title: 'Open jobs',
      link: ['/jobs', 'Open Jobs page'],
      rows,
      summary: (r: Job[]) => `${r.length} open job${r.length === 1 ? '' : 's'} · ${r.reduce((t, j) => t + j.openings, 0)} openings`,
      cols: [
        ['Role', (j: Job) => (<div><b>{j.title}</b><div style={{ color: 'var(--muted)', fontSize: 12.5 }}>{j.client?.name}</div></div>)],
        ['Location', (j: Job) => j.city + (j.remote ? ' · Remote OK' : '')],
        ['Openings', (j: Job) => j.openings],
        ['Open for', (j: Job) => j.daysOpen + 'd'],
        ['In pipeline', (j: Job) => j.pipelineCount],
        ['Priority', (j: Job) => <span className={'badge ' + (j.priority === 'High' ? 'bad' : j.priority === 'Medium' ? 'warn' : '')}>{j.priority}</span>],
      ],
    });
  }
  if (kind === 'active') {
    const rows = [...active].sort((a, b) => STAGES.indexOf(b.stage) - STAGES.indexOf(a.stage)).map((a) => ({ ...a, ...appRow(a) }));
    return def({
      loading,
      title: 'Active pipeline',
      link: ['/pipeline', 'Open Pipeline board'],
      rows,
      summary: (r: Application[]) => `${r.length} candidates in progress across ${new Set(r.map((a) => a.job.id)).size} jobs`,
      cols: stageCols,
    });
  }
  if (kind === 'stage') {
    const i = STAGES.indexOf(arg ?? '');
    const rows = A.filter((a) => stageKind(a.stage) !== 'rejected' && STAGES.indexOf(a.stage) >= i).map((a) => ({ ...a, ...appRow(a) }));
    return def({
      loading,
      title: `Reached ${arg}`,
      link: ['/pipeline', 'Open Pipeline board'],
      rows,
      summary: (r: Application[]) => `${r.length} candidates reached ${arg} or beyond`,
      cols: stageCols,
    });
  }
  if (kind === 'placed' || kind === 'ttf') {
    const rows = A.filter((a) => stageKind(a.stage) === 'placed').map((a) => ({
      ...a,
      ...appRow(a),
      days: Math.max(0, Math.round((new Date(a.stageChangedAt).getTime() - new Date(a.job.openedAt ?? a.stageChangedAt).getTime()) / DAY)),
      fee: feeOf(a),
    }));
    type P = (typeof rows)[number];
    return def({
      loading,
      title: kind === 'ttf' ? 'Time to fill' : 'Placements',
      link: ['/pipeline', 'Open Pipeline board'],
      rows,
      summary: (r: P[]) =>
        kind === 'ttf'
          ? `Average ${r.length ? Math.round(r.reduce((t, a) => t + a.days, 0) / r.length) : 0} days from job opened to placed`
          : `${r.length} placement${r.length === 1 ? '' : 's'}${r[0]?.fee != null ? ' · ' + money(r.reduce((t, a) => t + (a.fee ?? 0), 0)) + ' billed' : ''}`,
      cols: [
        ['Candidate', (a: P) => <Person c={a.candidate} sub={a.job.title} />],
        ['Client', (a: P) => a.job.client?.name],
        ['Placed on', (a: P) => fmt(a.stageChangedAt)],
        ['Days to fill', (a: P) => a.days + 'd'],
        ...(rows[0]?.fee != null ? [['Fee', (a: P) => <b>{money(a.fee)}</b>]] : []),
      ],
    });
  }
  if (kind === 'forecast') {
    const rows = active
      .map((a) => ({ ...a, ...appRow(a), prob: STAGE_PROB[a.stage] ?? 0, fee: feeOf(a) }))
      .filter((a) => a.fee != null)
      .map((a) => ({ ...a, exp: (a.fee as number) * a.prob }))
      .sort((x, y) => y.exp - x.exp);
    type F = (typeof rows)[number];
    return def({
      loading,
      title: 'Weighted forecast',
      link: ['/pipeline', 'Open Pipeline board'],
      rows,
      summary: (r: F[]) => `${money(r.reduce((t, a) => t + a.exp, 0))} expected from ${r.length} open applications (fee × stage probability)`,
      cols: [
        ['Candidate', (a: F) => <Person c={a.candidate} sub={a.job.title} />],
        ['Stage', (a: F) => <StageBadge stage={a.stage} />],
        ['Probability', (a: F) => Math.round(a.prob * 100) + '%'],
        ['Fee if placed', (a: F) => money(a.fee)],
        ['Expected', (a: F) => <b>{money(a.exp)}</b>],
      ],
    });
  }
  if (kind === 'source') {
    const rows = (cands.data ?? []).filter((c) => (c.source || 'Direct') === arg).map((c) => ({ ...c, go: '/candidates/' + c.id, key: c.id }));
    return def({
      loading,
      title: `Candidates from ${arg}`,
      link: ['/candidates', 'Open Talent pool'],
      rows,
      summary: (r: Candidate[]) => `${r.length} candidates sourced via ${arg}`,
      cols: [
        ['Candidate', (c: Candidate) => <Person c={c} sub={c.title} />],
        ['City', (c: Candidate) => c.city],
        ['Experience', (c: Candidate) => c.exp + ' yrs'],
        ['Expected CTC', (c: Candidate) => money(c.expected)],
        ['Pipelines', (c: Candidate) => c.pipelines || '—'],
      ],
    });
  }
  return { loading: false, title: '', rows: [], cols: [], summary: () => '' };
}

/** Right-hand drawer listing the records behind a dashboard number. */
export default function DrillDown({ kind, arg, onClose }: { kind: DrillKind; arg?: string; onClose: () => void }) {
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
          {!d.loading && <div style={{ color: 'var(--text2)', fontSize: 13, marginTop: 2 }}>{d.summary(d.rows as never[])}</div>}
        </>
      }
    >
      {d.loading ? (
        <Skeleton rows={7} />
      ) : !d.rows.length ? (
        <Empty title="Nothing here yet" sub="No records match this metric." />
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
export { DrillDown };
