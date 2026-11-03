import { Paginated } from '@/components/ui/Paginated';
import { useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Check, Clock, Copy, MapPin, Plus, Sparkles, Trash2, Wallet } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { applicationsApi } from '@/api/endpoints/applications';
import { jobsApi } from '@/api/endpoints/jobs';
import { errorMessage } from '@/api/errors';
import { useApiMutation } from '@/api/hooks';
import { useJob } from '@/api/queries/jobs';
import { pipelineOf, usePipelines } from '@/api/queries/pipelines';
import { queryKeys } from '@/api/queryKeys';
import { CandidateGlance } from '@/components/business/CandidateGlance';
import { CandidateDrawer } from '@/components/forms';
import { Avatar, Chips, Empty, ScoreRing, Skeleton, StageBadge } from '@/components/ui';
import { money } from '@/lib/format';
import { useCan } from '@/lib/permissions';
import { toast } from '@/stores/ui.store';
import { CareersCard } from './CareersCard';
import { ExplainModal } from './ExplainModal';

export function JobDetailPage() {
  const { id = '' } = useParams();
  const nav = useNavigate();
  const qc = useQueryClient();
  const canDelete = useCan('jobs:delete');
  const canEdit = useCan('jobs:write');
  const { pipelines, multi } = usePipelines();
  const { data: j, isLoading, error } = useJob(id);
  const [open, setOpen] = useState<string | null>(null);
  const [why, setWhy] = useState<{ id: string; name: string } | null>(null);

  const inPipeline = new Set((j?.applications ?? []).map((a) => a.candidate.id));
  const refresh = [queryKeys.jobs.all, queryKeys.applications.all, queryKeys.candidates.all];
  const add = useApiMutation((candidate: string) => applicationsApi.add(candidate, id), {
    invalidate: refresh,
    onSuccess: () => toast('Added to pipeline'),
    onError: (e) => toast(errorMessage(e), 'error'),
  });
  const setPipeline = useApiMutation(
    (pipelineId: string) => jobsApi.update(id, { pipelineId: pipelineId === 'default' ? '' : pipelineId }),
    {
      invalidate: refresh,
      onSuccess: () => toast('Hiring pipeline changed'),
      onError: (e) => toast(errorMessage(e), 'error'),
    },
  );
  const remove = async () => {
    if (!confirm('Delete this job and its pipeline?')) return;
    try {
      await jobsApi.remove(id);
      toast('Job deleted');
      nav('/jobs');
      await Promise.all(refresh.map((queryKey) => qc.invalidateQueries({ queryKey })));
    } catch (e) {
      toast(errorMessage(e), 'error');
    }
  };

  if (isLoading && !j)
    return (
      <div className="card">
        <Skeleton rows={9} />
      </div>
    );
  if (error || !j) return <Empty title="Job not found" />;
  const meta = { display: 'flex', gap: 5, alignItems: 'center' } as const;
  return (
    <>
      <Link to="/jobs" style={{ display: 'inline-flex', gap: 6, alignItems: 'center', color: 'var(--text2)', marginBottom: 14 }}>
        <ArrowLeft size={15} />
        All jobs
      </Link>
      <div className="card">
        <div className="card-b" style={{ display: 'flex', gap: 18, flexWrap: 'wrap', alignItems: 'center' }}>
          <Avatar name={j.client?.name} size={52} />
          <div style={{ flex: 1, minWidth: 260 }}>
            <h1 style={{ fontSize: 22, letterSpacing: '-.02em' }}>{j.title}</h1>
            <div style={{ color: 'var(--text2)', display: 'flex', gap: 16, flexWrap: 'wrap', marginTop: 4, fontSize: 13.5 }}>
              <span>{j.client?.name}</span>
              <span style={meta}>
                <MapPin size={14} />
                {j.city}
                {j.remote && ' · Remote OK'}
              </span>
              <span style={meta}>
                <Wallet size={14} />
                {money(j.salMin)} – {money(j.salMax)}
              </span>
              <span style={meta}>
                <Clock size={14} />
                {j.expMin}–{j.expMax} yrs
              </span>
              {j.client?.feePct != null && <span>Fee {j.client.feePct}%</span>}
            </div>
            <div style={{ marginTop: 12 }}>
              <Chips items={j.skills} />
            </div>
            {multi && (
              <label style={{ display: 'block', marginTop: 12, fontSize: 12.5, color: 'var(--text2)' }}>
                Hiring pipeline
                <select
                  className="select"
                  aria-label="Hiring pipeline"
                  style={{ display: 'block', width: 220 }}
                  disabled={!canEdit || setPipeline.isPending}
                  value={pipelineOf(pipelines, j.pipelineId)?.id}
                  onChange={(e) => setPipeline.mutate(e.target.value)}
                >
                  {pipelines.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </label>
            )}
          </div>
          {canDelete && (
            <button className="btn danger" onClick={remove}>
              <Trash2 size={15} />
              Delete
            </button>
          )}
        </div>
      </div>
      <div className="grid cols-3" style={{ marginTop: 18 }}>
        <div className="card">
          <div className="card-h">
            <Sparkles size={17} color="var(--brand)" />
            <h3>Smart matches</h3>
            <small>skills 55% · experience 20% · salary 15% · location 10%</small>
          </div>
          {j.matches.length ? (
            <Paginated
              items={j.matches}
              render={(pageRows) => (
                <table className="table" style={{ marginTop: 12 }}>
                  <thead>
                    <tr>
                      <th>Candidate</th>
                      <th>Score</th>
                      <th>Skills</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {pageRows.map((m) => (
                      <tr key={m.candidate.id}>
                        <td>
                          <div
                            className="who"
                            style={{ cursor: 'pointer' }}
                            role="button"
                            tabIndex={0}
                            onClick={() => setOpen(m.candidate.id)}
                            onKeyDown={(e) => e.key === 'Enter' && setOpen(m.candidate.id)}
                          >
                            <Avatar name={m.candidate.name} />
                            <div>
                              <b>{m.candidate.name}</b>
                              <span>
                                {m.candidate.title} · {m.candidate.exp}y · {m.candidate.city}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td>
                          <ScoreRing score={m.score} />
                        </td>
                        <td style={{ maxWidth: 280 }}>
                          <Chips items={j.skills} hit={m.hit} miss={m.missing} />
                          {m.notes
                            .filter((n) => !n.startsWith('Missing'))
                            .map((n) => (
                              <div key={n} style={{ fontSize: 12, color: 'var(--muted)' }}>
                                {n}
                              </div>
                            ))}
                        </td>
                        <td style={{ whiteSpace: 'nowrap' }}>
                          <button
                            className="btn sm ghost"
                            title="Why this score?"
                            onClick={() => setWhy({ id: m.candidate.id, name: m.candidate.name })}
                          >
                            <Sparkles size={13} />
                            Why?
                          </button>{' '}
                          {inPipeline.has(m.candidate.id) ? (
                            <button className="btn sm" disabled aria-label={`${m.candidate.name} added`}>
                              <Check size={14} />
                              Added
                            </button>
                          ) : (
                            <button
                              className="btn sm primary"
                              aria-label={`Add ${m.candidate.name}`}
                              disabled={add.isPending && add.variables === m.candidate.id}
                              onClick={() => add.mutate(m.candidate.id)}
                            >
                              <Plus size={14} />
                              Add
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            />
          ) : (
            <Empty title="Everyone is in this pipeline" />
          )}
        </div>
        <div style={{ display: 'grid', gap: 18, alignContent: 'start' }}>
          <div className="card">
            <div className="card-h">
              <h3>Pipeline</h3>
              <small>{j.applications.length} applications</small>
            </div>
            <div className="card-b">
              {j.applications.length ? (
                <ul className="list">
                  {j.applications.map((a) => (
                    <li key={a.id} style={{ alignItems: 'center', cursor: 'pointer' }} onClick={() => setOpen(a.candidate.id)}>
                      <Avatar name={a.candidate.name} size={32} />
                      <div style={{ flex: 1 }}>
                        <b>{a.candidate.name}</b>
                        <CandidateGlance candidate={a.candidate} />
                      </div>
                      <StageBadge stage={a.stage} />
                      <ScoreRing score={a.score} size={34} />
                    </li>
                  ))}
                </ul>
              ) : (
                <Empty title="No candidates yet" sub="Add from the match list." />
              )}
            </div>
          </div>
          <CareersCard key={j.id + String(j.updatedAt ?? '')} job={j} />
          <div className="card">
            <div className="card-h">
              <h3>Boolean search string</h3>
            </div>
            <div className="card-b">
              <div className="code">{j.booleanString}</div>
              <button
                className="btn sm"
                style={{ marginTop: 10 }}
                onClick={() => {
                  void navigator.clipboard?.writeText(j.booleanString);
                  toast('Copied to clipboard');
                }}
              >
                <Copy size={14} />
                Copy
              </button>
            </div>
          </div>
        </div>
      </div>
      {open && <CandidateDrawer id={open} onClose={() => setOpen(null)} />}
      {why && <ExplainModal name={why.name} candidateId={why.id} jobId={id} onClose={() => setWhy(null)} />}
    </>
  );
}
