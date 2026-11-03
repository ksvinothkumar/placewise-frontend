import { Check, Loader2, Plus } from 'lucide-react';
import { useState } from 'react';
import type { CandidateJobRef } from '@/api/endpoints/candidates';
import { pipelineOf, usePipelines } from '@/api/queries/pipelines';
import { ScoreRing } from '@/components/ui/Badges';

interface Row {
  job: CandidateJobRef;
  score: number;
  notes: string[];
  inPipeline: boolean;
}

/**
 * The "best-fit open jobs" list shared by the candidate profile and both candidate drawers. With more than one hiring pipeline each job
 * shows which pipeline (and entry stage) the candidate will start in, and the list can be narrowed to one pipeline. Adding flips the
 * button to a disabled "Added" straight away; `onAdd` returns false when it failed so the button goes back to "Add".
 */
export function BestFitJobs({ jobs, onAdd }: { jobs: Row[]; onAdd: (jobId: string) => Promise<boolean | void> }) {
  const { pipelines, multi } = usePipelines();
  const [filter, setFilter] = useState('');
  const [adding, setAdding] = useState<string[]>([]);
  const [added, setAdded] = useState<string[]>([]);
  const shown = jobs.filter((b) => !filter || pipelineOf(pipelines, b.job.pipelineId)?.id === filter);

  const add = async (id: string) => {
    setAdding((a) => [...a, id]);
    const ok = (await onAdd(id).catch(() => false)) !== false;
    setAdding((a) => a.filter((x) => x !== id));
    if (ok) setAdded((a) => [...a, id]);
  };

  return (
    <>
      {multi && (
        <select
          className="select"
          aria-label="Filter jobs by pipeline"
          style={{ marginBottom: 8, width: '100%' }}
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        >
          <option value="">All pipelines</option>
          {pipelines.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      )}
      {shown.map((b) => {
        const pl = multi ? pipelineOf(pipelines, b.job.pipelineId) : undefined;
        const entry = pl?.stages.find((s) => s.kind === 'start')?.name;
        const done = b.inPipeline || added.includes(b.job.id);
        return (
          <div key={b.job.id} className="who" style={{ padding: '9px 0', borderBottom: '1px solid var(--line2)' }}>
            <ScoreRing score={b.score} size={40} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <b>{b.job.title}</b>
              <span>
                {b.job.client?.name}
                {b.notes.length ? ' · ' + b.notes[0] : ' · Strong fit'}
              </span>
              {pl && (
                <span>
                  {pl.name}
                  {entry ? ` · starts at ${entry}` : ''}
                </span>
              )}
            </div>
            {done ? (
              <button type="button" className="btn sm" disabled aria-label={`Added to ${b.job.title}`}>
                <Check size={14} />
                Added
              </button>
            ) : (
              <button
                type="button"
                className="btn sm primary"
                disabled={adding.includes(b.job.id)}
                aria-label={`Add to ${b.job.title}`}
                onClick={() => void add(b.job.id)}
              >
                {adding.includes(b.job.id) ? <Loader2 size={14} className="spin" /> : <Plus size={14} />}
                Add
              </button>
            )}
          </div>
        );
      })}
      {!shown.length && <div style={{ color: 'var(--muted)', fontSize: 13 }}>No open jobs on this pipeline.</div>}
    </>
  );
}
