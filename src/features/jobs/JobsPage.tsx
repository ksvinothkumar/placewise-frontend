import { Paginated } from '@/components/ui/Paginated';
import { useQueryClient } from '@tanstack/react-query';
import { ExternalLink, Globe, Plus, Search } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { jobsApi, type Job } from '@/api/endpoints/jobs';
import { errorMessage } from '@/api/errors';
import { useApiMutation } from '@/api/hooks';
import { useJobs } from '@/api/queries/jobs';
import { queryKeys } from '@/api/queryKeys';
import { JobForm } from '@/components/forms';
import { Empty, PageHead, ScoreRing, Skeleton } from '@/components/ui';
import { money } from '@/lib/format';
import { useCan } from '@/lib/permissions';
import { toast } from '@/stores/ui.store';

const PRI: Record<string, string> = { High: 'bad', Medium: 'warn', Low: '' };

/** Case-insensitive match over title, client and city (the legacy search box). */
export const jobMatches = (j: Job, q: string, status: string) =>
  (!status || j.status === status) && (!q || `${j.title} ${j.client?.name ?? ''} ${j.city}`.toLowerCase().includes(q.toLowerCase()));

export function JobsPage() {
  const { data: jobs, isLoading } = useJobs();
  const nav = useNavigate();
  const qc = useQueryClient();
  const canWrite = useCan('jobs:write');
  const [form, setForm] = useState(false);
  const [q, setQ] = useState('');
  const [st, setSt] = useState('');

  const setPublic = useApiMutation((v: { id: string; value: boolean }) => jobsApi.update(v.id, { public: v.value }), {
    invalidate: [queryKeys.jobs.all],
    onError: (e) => toast(errorMessage(e), 'error'),
  });
  const publishAll = async () => {
    const todo = (jobs ?? []).filter((j) => j.status === 'open' && !j.public);
    if (!todo.length) return toast('Every open job is already published');
    if (!confirm(`Publish ${todo.length} open job${todo.length > 1 ? 's' : ''} on the public careers page? Client names and salaries are never shown.`)) return;
    try {
      for (const j of todo) await jobsApi.update(j.id, { public: true });
      toast(`${todo.length} job${todo.length > 1 ? 's' : ''} published`);
    } catch (e) {
      toast(errorMessage(e), 'error');
    } finally {
      await qc.invalidateQueries({ queryKey: queryKeys.jobs.all });
    }
  };

  const list = (jobs ?? []).filter((j) => jobMatches(j, q, st));
  return (
    <>
      <PageHead title="Jobs" sub="Open requisitions across all clients">
        {canWrite && (
          <button className="btn" onClick={publishAll}>
            <Globe size={16} />
            Publish all open
          </button>
        )}
        <a className="btn" href="/careers" target="_blank" rel="noreferrer">
          <ExternalLink size={16} />
          View careers page
        </a>
        {canWrite && (
          <button className="btn primary" onClick={() => setForm(true)}>
            <Plus size={16} />
            New job
          </button>
        )}
      </PageHead>
      <div className="card">
        <div className="toolbar">
          <div className="search">
            <Search size={16} />
            <input className="input" placeholder="Search jobs, clients, cities…" aria-label="Search jobs" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <select className="select" aria-label="Status" value={st} onChange={(e) => setSt(e.target.value)}>
            <option value="">All statuses</option>
            <option value="open">Open</option>
            <option value="filled">Filled</option>
            <option value="on-hold">On hold</option>
          </select>
        </div>
        {isLoading ? (
          <Skeleton />
        ) : list.length ? (
          <Paginated items={list} render={(pageRows, from) => (
          <table className="table">
            <thead>
              <tr><th className="sn">#</th>
                <th>Role</th>
                <th>Client</th>
                <th>Location</th>
                <th>Budget</th>
                <th>Pipeline</th>
                <th>Best match</th>
                <th>Priority</th>
                <th>Status</th>
                <th>Careers page</th>
              </tr>
            </thead>
            <tbody>
              {pageRows.map((j, n) => (
                <tr key={j.id} className="click" onClick={() => nav('/jobs/' + j.id)}><td className="sn">{from + n + 1}</td>
                  <td>
                    <b>{j.title}</b>
                    <div style={{ color: 'var(--muted)', fontSize: 12.5 }}>
                      {j.daysOpen}d open · {j.openings} opening{j.openings > 1 ? 's' : ''}
                    </div>
                  </td>
                  <td>{j.client?.name}</td>
                  <td>
                    {j.city}
                    {j.remote && (
                      <span className="badge brand" style={{ marginLeft: 8 }}>
                        Remote OK
                      </span>
                    )}
                  </td>
                  <td>
                    {money(j.salMin)} – {money(j.salMax)}
                  </td>
                  <td>{j.pipelineCount}</td>
                  <td>
                    {j.best ? (
                      <div className="who">
                        <ScoreRing score={j.best.score} size={36} />
                        <span>{j.best.name}</span>
                      </div>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td>
                    <span className={'badge ' + PRI[j.priority]}>{j.priority}</span>
                  </td>
                  <td>
                    <span className={'badge ' + (j.status === 'open' ? 'good' : '')}>{j.status}</span>
                  </td>
                  <td onClick={(e) => e.stopPropagation()}>
                    {j.status === 'open' ? (
                      <button
                        className={'btn sm ' + (j.public ? '' : 'ghost')}
                        style={j.public ? { color: 'var(--good)' } : undefined}
                        disabled={!canWrite}
                        onClick={() => setPublic.mutate({ id: j.id, value: !j.public })}
                        title={j.public ? 'Click to unpublish' : 'Click to publish'}
                        aria-label={`${j.public ? 'Unpublish' : 'Publish'} ${j.title}`}
                      >
                        <Globe size={13} />
                        {j.public ? 'Live' : 'Publish'}
                      </button>
                    ) : (
                      <span style={{ color: 'var(--muted)' }}>—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          )} />
        ) : (
          <Empty title="No jobs found" sub="Try a different search or create a new job." />
        )}
      </div>
      {form && <JobForm onClose={() => setForm(false)} onSaved={(j) => nav('/jobs/' + j.id)} />}
    </>
  );
}
