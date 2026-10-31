import { useState } from 'react';
import { useApiQuery, asList } from '@/api/hooks';
import type { Application } from '@/api/endpoints/applications';
import { CandidateDrawer } from '@/components/business/CandidateDrawer';
import { Kanban } from '@/components/Kanban';
import { ScoreRing } from '@/components/ui/Badges';
import { PageHead } from '@/components/ui/Layout';
import { Skeleton } from '@/components/ui/Skeleton';
import { STAGES, isTerminalStage, stageColor } from '@/lib/format';
import { useApplications, useMoveStage } from './usePipeline';

const DECISION = { interested: ['good', 'Interested'], hold: ['warn', 'On hold'], not_fit: ['bad', 'No'] } as const;

interface JobOption {
  id: string;
  title: string;
  client?: { name: string };
}

export function PipelinePage() {
  const [job, setJob] = useState('');
  const [open, setOpen] = useState<string | null>(null);
  const jobs = useApiQuery<JobOption[] | { items: JobOption[] }>('/jobs');
  const { data: apps, isLoading } = useApplications(job);
  const move = useMoveStage(job);
  const list = apps ?? [];

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
        <select className="select" aria-label="Filter by job" style={{ width: 280 }} value={job} onChange={(e) => setJob(e.target.value)}>
          <option value="">All jobs</option>
          {asList(jobs.data).map((j) => (
            <option key={j.id} value={j.id}>
              {j.title} · {j.client?.name}
            </option>
          ))}
        </select>
      </PageHead>
      {isLoading && !list.length ? (
        <div className="card">
          <Skeleton rows={7} />
        </div>
      ) : (
        <Kanban
          lanes={STAGES.map((st) => {
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
