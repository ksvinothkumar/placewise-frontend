import { useQuery } from '@tanstack/react-query';
import { Activity, AlertTriangle, BadgeCheck, Briefcase, CalendarClock, ListChecks, Timer, TrendingUp, Users } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { dashboardApi, dashboardKey } from '@/api/endpoints/dashboard';
import { DrillDown } from '@/components/business/DrillDown';
import { Donut, HBars } from '@/components/charts';
import { EmptyState } from '@/components/ui/EmptyState';
import { Kpi, PageHead } from '@/components/ui/Layout';
import { Skeleton } from '@/components/ui/Skeleton';
import { fmtDT, money, rel, stageColor } from '@/lib/format';

const SRC = ['#4f46e5', '#0ea5e9', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6'];

export function DashboardPage() {
  const nav = useNavigate();
  const { data: d } = useQuery({ queryKey: dashboardKey, queryFn: dashboardApi.get });
  const [drill, setDrill] = useState<{ kind: string; arg?: string } | null>(null);
  const open = (kind: string, arg?: string) => setDrill({ kind, arg });
  if (!d)
    return (
      <>
        <PageHead title="Dashboard" />
        <div className="card">
          <Skeleton rows={8} />
        </div>
      </>
    );
  const k = d.kpis;
  const total = d.sources.reduce((t, s) => t + s.value, 0);
  return (
    <>
      <PageHead title="Dashboard" sub="Your recruitment pipeline at a glance" />
      <div className="grid kpis">
        <Kpi icon={Briefcase} label="Open jobs" value={k.openJobs} sub={`${k.openings} openings`} onClick={() => open('jobs')} />
        <Kpi icon={Users} label="Active pipeline" value={k.activePipeline} sub={`${k.candidates} in talent pool`} tone="info" onClick={() => open('active')} />
        <Kpi icon={BadgeCheck} label="Placements" value={k.placements} sub={k.billed != null ? `Billed ${money(k.billed)}` : 'Completed placements'} tone="good" onClick={() => open('placed')} />
        {k.forecast != null && <Kpi icon={TrendingUp} label="Weighted forecast" value={money(k.forecast)} sub="Stage-probability revenue" onClick={() => open('forecast')} />}
        <Kpi icon={Timer} label="Avg time-to-fill" value={k.avgTimeToFill ? k.avgTimeToFill + 'd' : '—'} sub="Open to placed" tone="warn" onClick={() => open('ttf')} />
      </div>
      <div className="grid cols-3" style={{ marginTop: 18 }}>
        <div className="card">
          <div className="card-h">
            <h3>Hiring funnel</h3>
            <small>click a stage to see who</small>
          </div>
          <div className="card-b chart-click" style={{ height: 290 }}>
            <HBars data={d.funnel.map((f) => ({ label: f.stage, value: f.count, color: stageColor(f.stage) }))} onSelect={(b) => open('stage', b.label)} />
          </div>
        </div>
        <div className="card">
          <div className="card-h">
            <h3>Candidate sources</h3>
            <small>click a slice</small>
          </div>
          <div className="card-b chart-click" style={{ height: 290, position: 'relative' }}>
            <Donut
              data={d.sources}
              colors={SRC}
              size={210}
              onSelect={(n) => open('source', n)}
              centre={
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 26, fontWeight: 700 }}>{total}</div>
                  <small style={{ color: 'var(--muted)' }}>candidates</small>
                </div>
              }
            />
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center', fontSize: 12.5, marginTop: 8 }}>
              {d.sources.map((s, i) => (
                <button
                  key={s.name}
                  type="button"
                  className="legend-click"
                  onClick={() => open('source', s.name)}
                  style={{ display: 'flex', gap: 6, alignItems: 'center', border: 0, background: 'none', font: 'inherit', color: 'inherit' }}
                >
                  <i className="dot" style={{ color: SRC[i % 6] }} />
                  {s.name} <b>{s.value}</b>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
      <div className="grid cols-2" style={{ marginTop: 18 }}>
        <div className="card">
          <div className="card-h">
            <AlertTriangle size={17} color="var(--warn)" />
            <h3>Jobs at risk</h3>
            <small>aging with a thin or stalled pipeline</small>
          </div>
          {d.atRisk.length ? (
            <table className="table" style={{ marginTop: 12 }}>
              <tbody>
                {d.atRisk.map((r) => (
                  <tr key={r.id} className="click" onClick={() => nav('/jobs/' + r.id)}>
                    <td>
                      <b>{r.title}</b>
                      <div style={{ color: 'var(--muted)', fontSize: 12.5 }}>{r.client}</div>
                    </td>
                    <td>{r.days}d open</td>
                    <td style={{ color: 'var(--text2)' }}>
                      {r.live} live · {r.advanced} advanced
                    </td>
                    <td>
                      <span className={'badge ' + (r.risk >= 3 ? 'bad' : 'warn')}>{r.risk >= 3 ? 'High' : 'Medium'}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <EmptyState title="All jobs healthy" />
          )}
        </div>
        <div className="card">
          <div className="card-h">
            <CalendarClock size={17} color="var(--brand)" />
            <h3>Upcoming interviews</h3>
            <Link to="/interviews" style={{ marginLeft: 'auto', color: 'var(--brand)', fontSize: 13 }}>
              View all
            </Link>
          </div>
          <div className="card-b">
            {d.interviews.length ? (
              <ul className="list">
                {d.interviews.map((i) => (
                  <li key={i.id} style={{ cursor: 'pointer' }} onClick={() => nav('/interviews')}>
                    <div className="ic">
                      <CalendarClock size={15} />
                    </div>
                    <div>
                      <b>{i.application.candidate.name}</b> · {i.round}
                      <div style={{ color: 'var(--muted)', fontSize: 12.5 }}>
                        {fmtDT(i.when)} · {i.mode} · {i.interviewer}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState title="Nothing scheduled" />
            )}
          </div>
        </div>
      </div>
      {d.tasks && (
        <div className="card" style={{ marginTop: 18, cursor: 'pointer' }} onClick={() => nav('/tasks')}>
          <div className="card-h">
            <ListChecks size={17} color="var(--brand)" />
            <h3>My tasks</h3>
            {d.tasks.overdue > 0 && <span className="badge bad">{d.tasks.overdue} overdue</span>}
            {d.tasks.today > 0 && <span className="badge warn">{d.tasks.today} due today</span>}
            <small style={{ marginLeft: 'auto' }}>{d.tasks.open} open · view all →</small>
          </div>
          <div className="card-b">
            {d.tasks.next.length ? (
              <ul className="list">
                {d.tasks.next.map((t) => (
                  <li key={t.id}>
                    <div style={{ flex: 1 }}>
                      <b>{t.title}</b>
                      {t.candidate && <span style={{ color: 'var(--muted)' }}> · {t.candidate.name}</span>}
                    </div>
                    <span style={{ color: t.due && new Date(t.due) < new Date() ? 'var(--bad)' : 'var(--muted)', fontSize: 12.5 }}>
                      {t.due ? new Date(t.due).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : ''}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <div style={{ color: 'var(--muted)' }}>You're all caught up. Add follow-ups from a candidate's profile.</div>
            )}
          </div>
        </div>
      )}
      <div className="card" style={{ marginTop: 18 }}>
        <div className="card-h">
          <Activity size={17} color="var(--brand)" />
          <h3>Recent activity</h3>
        </div>
        <div className="card-b">
          <ul className="list">
            {d.activity.map((a) => (
              <li key={a.id}>
                <div className="ic" style={a.kind === 'placed' ? { background: 'var(--good-soft)', color: 'var(--good)' } : undefined}>
                  <BadgeCheck size={15} />
                </div>
                <div style={{ flex: 1 }}>{a.text}</div>
                <span style={{ color: 'var(--muted)', fontSize: 12.5 }}>{rel(a.createdAt)}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
      {drill && <DrillDown kind={drill.kind} arg={drill.arg} onClose={() => setDrill(null)} />}
    </>
  );
}
