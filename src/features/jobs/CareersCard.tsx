import { Copy, ExternalLink, Globe } from 'lucide-react';
import { useState } from 'react';
import { jobsApi, type JobDetail } from '@/api/endpoints/jobs';
import { errorMessage } from '@/api/errors';
import { useApiMutation } from '@/api/hooks';
import { queryKeys } from '@/api/queryKeys';
import { AiButton, useAi } from '@/components/business/ai';
import { toast } from '@/stores/ui.store';

/** Public description + publish switch for one job. */
export function CareersCard({ job }: { job: JobDetail }) {
  const aiw = useAi();
  const [desc, setDesc] = useState(job.description || '');
  const link = `${location.origin}/careers/${job.id}`;
  const m = useApiMutation((body: { public?: boolean; description?: string }) => jobsApi.update(job.id, body), {
    invalidate: [queryKeys.jobs.all],
    onError: (e) => toast(errorMessage(e), 'error'),
  });
  const put = (body: { public?: boolean; description?: string }, ok: string) => m.mutate(body, { onSuccess: () => toast(ok) });
  const busy = m.isPending;
  return (
    <div className="card">
      <div className="card-h">
        <Globe size={17} color="var(--brand)" />
        <h3>Careers page</h3>
        <span className={'badge ' + (job.public ? 'good' : '')} style={{ marginLeft: 'auto' }}>
          {job.public ? 'Published' : 'Not published'}
        </span>
      </div>
      <div className="card-b">
        <textarea
          className="textarea"
          style={{ minHeight: 100 }}
          aria-label="Public job description"
          placeholder="Public job description: responsibilities, requirements, what's on offer. Client name and salary are never shown."
          value={desc}
          onChange={(e) => setDesc(e.target.value)}
        />
        <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
          <AiButton
            busy={aiw.busy}
            label="Draft with AI"
            onClick={async () => {
              const r = await aiw.run<{ text: string }>('/job-description', {
                title: job.title,
                skills: job.skills,
                city: job.city,
                expMin: job.expMin,
                expMax: job.expMax,
                industry: job.client?.industry,
              });
              if (r) setDesc(r.text);
            }}
          />
          <button className="btn sm" disabled={busy || desc === (job.description || '')} onClick={() => put({ description: desc }, 'Description saved')}>
            Save description
          </button>
          <button
            className={'btn sm ' + (job.public ? '' : 'primary')}
            disabled={busy}
            onClick={() => put({ public: !job.public, description: desc }, job.public ? 'Unpublished' : 'Published on the careers page')}
          >
            {job.public ? 'Unpublish' : 'Publish job'}
          </button>
          {job.public && (
            <>
              <button
                className="btn sm"
                onClick={() => {
                  void navigator.clipboard?.writeText(link);
                  toast('Link copied');
                }}
              >
                <Copy size={13} />
                Copy link
              </button>
              <a className="btn sm" href={link} target="_blank" rel="noreferrer">
                <ExternalLink size={13} />
                View
              </a>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
