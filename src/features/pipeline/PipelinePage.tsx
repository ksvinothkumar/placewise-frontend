import { useState } from 'react';
import { useApiQuery, asList } from '@/api/hooks';
import { pipelineOf, usePipelines } from '@/api/queries/pipelines';
import type { Application } from '@/api/endpoints/applications';
import { CandidateDrawer } from '@/components/business/CandidateDrawer';
import { Kanban } from '@/components/Kanban';
import { ScoreRing } from '@/components/ui/Badges';
import { PageHead } from '@/components/ui/Layout';
import { SearchSelect } from '@/components/ui/SearchSelect';
import { Skeleton } from '@/components/ui/Skeleton';
import { STAGES, isTerminalStage, stageColor } from '@/lib/format';
import { useApplications, useMoveStage } from './usePipeline';

const DECISION = { interested: ['good', 'Interested'], hold: ['warn', 'On hold'], not_fit: ['bad', 'No'] } as const;

interface JobOption {
  id: string;
  title: string;
  client?: { id?: string; name: string };
  pipelineId?: string;
}

/** Jobs and applications both carry the client; match on id when there is one, else on name. */
const clientKey = (c?: { id?: string; name: string }) => (c ? (c.id ?? c.name) : '');

export function PipelinePage() {
  const [job, setJob] = useState('');
  const [client, setClient] = useState('');
  const [pl, setPl] = useState('');
  const [open, setOpen] = useState<string | null>(null);
  const jobs = useApiQuery<JobOption[] | { items: JobOption[] }>('/jobs');
  const { data: apps, isLoading } = useApplications(job);
  const move = useMoveStage(job);
  const { pipelines, multi } = usePipelines();
  const current = pipelineOf(pipelines, pl);
  const inCurrent = (p?: string) => !multi || (p || 'default') === (current?.id ?? 'default');
  const allJobs = asList(jobs.data).filter((j) => inCurrent(j.pipelineId));
  const clients = [...new Map(allJobs.filter((j) => j.client).map((j) => [clientKey(j.client), j.client!.name])).entries()].sort((a, b) =>
    a[1].localeCompare(b[1]),
  );
  const jobOptions = client ? allJobs.filter((j) => clientKey(j.client) === client) : allJobs;
  const list = (apps ?? []).filter((a) => inCurrent(a.job.pipelineId) && (!client || clientKey(a.job.client) === client));
  const lanes = multi && current ? current.stages.map((s) => s.name) : STAGES;

  const card = (a: Application) => {
    const d = a.clientFeedback?.decision ? DECISION[a.clientFeedback.decision] : null;
    return (
      <>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="t">{a.candidate.name}</div>
            <div className="s">{a.job.title}</div>
          </div>
          <ScoreRing score={a.score} size={38} />
        </div>
        <div className="f">
          <span>{a.job.client?.name}</span>
          <span style={{ marginLeft: 'auto' }}>{a.daysInStage}d</span>
          {d && (
            <span className={'badge ' + d[0]} title={a.clientFeedback?.comment || ''}>
              Client: {d[1]}
            </span>
          )}
          {a.daysInStage > 7 && !isTerminalStage(a.stage) && <span className="badge warn">Stale</span>}
        </div>
      </>
    );
  };

  return (
    <>
      <PageHead title="Pipeline" sub="Drag candidates between stages. Moving to Placed books the fee.">
        {multi && (
          <select
            className="select"
            aria-label="Pipeline"
            style={{ width: 190 }}
            value={current?.id ?? ''}
            onChange={(e) => {
              setPl(e.target.value);
              setClient('');
              setJob('');
            }}
          >
            {pipelines.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        )}
        <SearchSelect
          label="Filter by client"
          allLabel="All clients"
          width={200}
          value={client}
          options={clients.map(([value, label]) => ({ value, label }))}
          onChange={(v) => {
            setClient(v);
            setJob('');
          }}
        />
        <SearchSelect
          label="Filter by job"
          allLabel="All jobs"
          width={280}
          value={job}
          options={jobOptions.map((j) => ({ value: j.id, label: `${j.title} · ${j.client?.name}` }))}
          onChange={setJob}
        />
      </PageHead>
      {isLoading && !list.length ? (
        <div className="card">
          <Skeleton rows={7} />
        </div>
      ) : (
        <Kanban
          lanes={lanes.map((st) => {
            const items = list.filter((a) => a.stage === st);
            return {
              id: st,
              items,
              header: (
                <>
                  <i className="dot" style={{ color: stageColor(st) }} />
                  {st}
                  <span className="n">{items.length}</span>
                </>
              ),
            };
          })}
          getId={(a) => a.id}
          getLabel={(a) => `${a.candidate.name}, ${a.job.title}, ${a.stage}`}
          renderCard={card}
          onOpen={(a) => setOpen(a.candidate.id)}
          onMove={(id, _from, stage) => move.mutate({ id, stage })}
        />
      )}
      {open && <CandidateDrawer id={open} onClose={() => setOpen(null)} />}
    </>
  );
}
