import { Paginated } from '@/components/ui/Paginated';
import { useQuery } from '@tanstack/react-query';
import { BadgeCheck, Download, Percent, Send, Target, Timer, TrendingUp, Trophy } from 'lucide-react';
import { useMemo, useState } from 'react';
import { reportsApi } from '@/api/endpoints/reports';
import { queryKeys } from '@/api/queryKeys';
import { BarLine, HBars, VBars } from '@/components/charts';
import { Kpi, PageHead } from '@/components/ui/Layout';
import { Skeleton } from '@/components/ui/Skeleton';
import { inr, stageColor } from '@/lib/format';
import { ReportDrill, type DrillTarget } from './ReportDrill';

const RANGES: [string, string][] = [
  ['30', 'Last 30 days'],
  ['90', 'Last 90 days'],
  ['365', 'Last 12 months'],
  ['all', 'All time'],
];
const AGE_COLORS = ['#10b981', '#0ea5e9', '#f59e0b', '#ef4444'];

/** Download rows as a CSV file (every cell quoted). */
export function downloadCsv(name: string, rows: (string | number | null | undefined)[][]) {
  const text = rows.map((r) => r.map((x) => `"${String(x ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
  const url = URL.createObjectURL(new Blob([text], { type: 'text/csv' }));
  Object.assign(document.createElement('a'), { href: url, download: name }).click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function ReportsPage() {
  const [range, setRange] = useState('90');
  const [drill, setDrill] = useState<DrillTarget | null>(null);
  const from = useMemo(() => (range === 'all' ? '2000-01-01' : new Date(Date.now() - +range * 864e5).toISOString()), [range]);
  const { data: d } = useQuery({ queryKey: [...queryKeys.reports.all, from.slice(0, 10)], queryFn: () => reportsApi.overview(from) });
  if (!d)
    return (
      <>
        <PageHead title="Reports" />
        <div className="card">
          <Skeleton rows={9} />
        </div>
      </>
    );
  const k = d.kpis;
  const money = k.revenue !== undefined;
  const maxPl = Math.max(1, ...d.recruiters.map((r) => r.placements));
  return (
    <>
      <PageHead title="Reports" sub="Funnel, sources, recruiter performance and trends">
        <select className="select" aria-label="Date range" style={{ width: 170 }} value={range} onChange={(e) => setRange(e.target.value)}>
          {RANGES.map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </select>
      </PageHead>
      <div className="grid kpis">
        <Kpi icon={BadgeCheck} label="Placements" value={k.placements} sub="in this period" tone="good" onClick={() => setDrill({ kind: 'placements' })} />
        <Kpi icon={Send} label="Submissions" value={k.submissions} sub="candidates sent to clients" onClick={() => setDrill({ kind: 'submissions' })} />
        <Kpi icon={Timer} label="Avg time to fill" value={k.avgDaysToFill != null ? k.avgDaysToFill + 'd' : '—'} sub="job opened to placed" tone="warn" onClick={() => setDrill({ kind: 'ttf' })} />
        <Kpi icon={Percent} label="Offer acceptance" value={k.offerAcceptRate != null ? k.offerAcceptRate + '%' : '—'} sub="of answered offers" tone="info" onClick={() => setDrill({ kind: 'offers' })} />
        {money && <Kpi icon={TrendingUp} label="Fees earned" value={inr(k.revenue)} sub="before GST" tone="good" onClick={() => setDrill({ kind: 'revenue' })} />}
      </div>

      <div className="grid cols-2" style={{ marginTop: 18 }}>
        <div className="card">
          <div className="card-h">
            <h3>Funnel conversion</h3>
            <small>applications created in period</small>
          </div>
          <div className="card-b" style={{ height: 300 }}>
            <HBars onSelect={(b) => setDrill({ kind: 'funnel', arg: b.label })} data={d.funnel.map((f) => ({ label: f.stage, value: f.count, color: stageColor(f.stage), hint: `${f.count}${f.conversion != null ? ` (${f.conversion}% of previous stage)` : ''}` }))} />
          </div>
        </div>
        <div className="card">
          <div className="card-h">
            <h3>Placements and time to fill</h3>
            <small>last 6 months</small>
          </div>
          <div className="card-b" style={{ height: 300 }}>
            <BarLine onSelect={(i) => setDrill({ kind: 'month', arg: String(i) })} data={d.monthly.map((m) => ({ label: m.month, bar: m.placements, line: m.avgDaysToFill }))} barName="Placements" lineName="Avg days to fill" />
          </div>
        </div>
      </div>

      <div className="card" style={{ marginTop: 18 }}>
        <div className="card-h">
          <Trophy size={17} color="var(--warn)" />
          <h3>Recruiter performance</h3>
          <button
            className="btn sm"
            style={{ marginLeft: 'auto' }}
            onClick={() =>
              downloadCsv('recruiters.csv', [
                ['Recruiter', 'Added', 'Pipeline', 'Submissions', 'Interviews', 'Offers', 'Placements', ...(money ? ['Fees', 'Commission'] : [])],
                ...d.recruiters.map((r) => [r.name, r.added, r.pipeline, r.submissions, r.interviews, r.offers, r.placements, ...(money ? [r.revenue, r.commission] : [])]),
              ])
            }
          >
            <Download size={13} />
            CSV
          </button>
        </div>
        <Paginated items={d.recruiters} render={(pageRows, from) => (
        <table className="table" style={{ marginTop: 12 }}>
          <thead>
            <tr><th className="sn">#</th>
              <th>Recruiter</th>
              <th>Added</th>
              <th>Pipeline</th>
              <th>Submitted</th>
              <th>Interviews</th>
              <th>Offers</th>
              <th style={{ width: 170 }}>Placements</th>
              <th>Target (this month)</th>
              {money && (
                <>
                  <th style={{ textAlign: 'right' }}>Fees</th>
                  <th style={{ textAlign: 'right' }}>Commission</th>
                </>
              )}
            </tr>
          </thead>
          <tbody>
            {pageRows.map((r, i) => (
              <tr key={r.id || 'none'} className="click" tabIndex={0} title="Click to see their candidates" onClick={() => setDrill({ kind: 'recruiter', arg: r.id || 'none' })} onKeyDown={(e) => { if (e.key === 'Enter') setDrill({ kind: 'recruiter', arg: r.id || 'none' }); }}><td className="sn">{from + i + 1}</td>
                <td>
                  <b>
                    {i === 0 && r.placements > 0 && '🏆 '}
                    {r.name}
                  </b>
                  {r.role && (
                    <span className="badge" style={{ marginLeft: 8 }}>
                      {r.role === 'admin' ? 'Admin' : 'HR'}
                    </span>
                  )}
                </td>
                <td>{r.added}</td>
                <td>{r.pipeline}</td>
                <td>{r.submissions}</td>
                <td>{r.interviews}</td>
                <td>{r.offers}</td>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <b style={{ width: 20 }}>{r.placements}</b>
                    <div style={{ flex: 1, height: 7, borderRadius: 4, background: 'var(--line2)' }}>
                      <div style={{ width: (r.placements / maxPl) * 100 + '%', height: 7, borderRadius: 4, background: 'var(--good)' }} />
                    </div>
                  </div>
                </td>
                <td>
                  {r.targetProgress ? (
                    <span className={'badge ' + (r.targetProgress.done >= r.targetProgress.goal ? 'good' : '')}>
                      <Target size={11} />
                      {r.targetProgress.done} / {r.targetProgress.goal}
                    </span>
                  ) : (
                    <span style={{ color: 'var(--muted)' }}>not set</span>
                  )}
                </td>
                {money && (
                  <>
                    <td style={{ textAlign: 'right' }}>{inr(r.revenue)}</td>
                    <td style={{ textAlign: 'right' }}>
                      <b>{inr(r.commission)}</b>
                    </td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
        )} />
        <div style={{ padding: '0 20px 16px', color: 'var(--muted)', fontSize: 12.5 }}>
          Set monthly targets{money ? ' and commission %' : ''} for each person on the Team page (Edit). Records created before this feature are grouped as "Unassigned".
        </div>
      </div>

      <div className="grid cols-2" style={{ marginTop: 18 }}>
        <div className="card">
          <div className="card-h">
            <h3>Source quality</h3>
            <small>which channels actually place people</small>
          </div>
          <table className="table" style={{ marginTop: 12 }}>
            <thead>
              <tr><th className="sn">#</th>
                <th>Source</th>
                <th>Candidates</th>
                <th>In pipeline</th>
                <th>Placed</th>
                <th>Rate</th>
              </tr>
            </thead>
            <tbody>
              {d.sources.map((s, n) => (
                <tr key={s.source} className="click" tabIndex={0} title="Click to see these candidates" onClick={() => setDrill({ kind: 'source', arg: s.source })} onKeyDown={(e) => { if (e.key === 'Enter') setDrill({ kind: 'source', arg: s.source }); }}><td className="sn">{n + 1}</td>
                  <td>
                    <b>{s.source}</b>
                  </td>
                  <td>{s.candidates}</td>
                  <td>{s.inPipeline}</td>
                  <td>{s.placements}</td>
                  <td>
                    <span className={'badge ' + (s.rate >= 10 ? 'good' : '')}>{s.rate}%</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={{ display: 'grid', gap: 18, alignContent: 'start' }}>
          <div className="card">
            <div className="card-h">
              <h3>Open jobs by age</h3>
            </div>
            <div className="card-b" style={{ height: 180 }}>
              <VBars onSelect={(b) => setDrill({ kind: 'jobage', arg: b.label })} data={d.jobAging.map((b, i) => ({ label: b.bucket, value: b.count, color: AGE_COLORS[i] ?? '#64748b' }))} height={160} />
            </div>
          </div>
          {d.revenueByClient && (
            <div className="card">
              <div className="card-h">
                <h3>Revenue by client</h3>
                <small>invoiced incl. GST</small>
              </div>
              <table className="table" style={{ marginTop: 8 }}>
                <tbody>
                  {d.revenueByClient.map((c, n) => (
                    <tr key={c.client}><td className="sn">{n + 1}</td>
                      <td>
                        <b>{c.client}</b>
                      </td>
                      <td style={{ textAlign: 'right' }}>{inr(c.invoiced)}</td>
                      <td style={{ textAlign: 'right', color: 'var(--bad)' }}>{c.outstanding ? inr(c.outstanding) + ' due' : ''}</td>
                    </tr>
                  ))}
                  {!d.revenueByClient.length && (
                    <tr>
                      <td style={{ color: 'var(--muted)' }}>No invoices yet</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
      {drill && <ReportDrill target={drill} from={from} onClose={() => setDrill(null)} />}
    </>
  );
}
