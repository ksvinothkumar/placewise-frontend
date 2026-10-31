import { Copy, Save, Sparkles } from 'lucide-react';
import { useState } from 'react';
import type { CandidateApplication, CandidateDetail } from '@/api/endpoints/candidates';
import { candidatesApi } from '@/api/endpoints/candidates';
import { errorMessage } from '@/api/errors';
import { useApiMutation } from '@/api/hooks';
import { queryKeys } from '@/api/queryKeys';
import { AiButton, useAi } from '@/components/business/ai';
import { toast } from '@/stores/ui.store';

/** Client-safe summary written by AI (or the template fallback); contact details and current salary are left out. */
export function ClientSummaryCard({ candidate, applications = [] }: { candidate: Pick<CandidateDetail, 'id'>; applications?: CandidateApplication[] }) {
  const { run, busy, ai } = useAi();
  const [job, setJob] = useState('');
  const [out, setOut] = useState<{ text: string } | null>(null);
  const [text, setText] = useState('');
  const gen = async () => {
    const r = await run<{ text: string }>('/candidate-summary', { candidateId: candidate.id, jobId: job || undefined });
    if (r) {
      setOut(r);
      setText(r.text);
    }
  };
  const save = useApiMutation(() => candidatesApi.update(candidate.id, { summary: text.split('\n\n')[0] }), {
    invalidate: [queryKeys.candidates.all],
    onSuccess: () => toast('Saved as the profile summary'),
    onError: (e) => toast(errorMessage(e), 'error'),
  });
  return (
    <div className="card no-print">
      <div className="card-h">
        <Sparkles size={17} color="var(--brand)" />
        <h3>Client-ready summary</h3>
        <small>{ai ? 'written by Claude' : 'template (add an API key for Claude)'}</small>
      </div>
      <div className="card-b">
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <select className="select" aria-label="Summary for job" style={{ flex: 1, minWidth: 140 }} value={job} onChange={(e) => setJob(e.target.value)}>
            <option value="">General profile</option>
            {applications.map((a) => (
              <option key={a.id} value={a.job.id}>
                For: {a.job.title}
              </option>
            ))}
          </select>
          <AiButton busy={busy} onClick={gen} label={out ? 'Regenerate' : 'Generate'} />
        </div>
        {out && (
          <>
            <textarea className="textarea" aria-label="Summary text" style={{ minHeight: 190, marginTop: 10 }} value={text} onChange={(e) => setText(e.target.value)} />
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <button
                className="btn sm"
                onClick={() => {
                  void navigator.clipboard?.writeText(text);
                  toast('Copied');
                }}
              >
                <Copy size={13} />
                Copy
              </button>
              <button className="btn sm" onClick={() => save.mutate()}>
                <Save size={13} />
                Save as profile summary
              </button>
            </div>
            <div style={{ color: 'var(--muted)', fontSize: 12, marginTop: 8 }}>
              Contact details and current salary are deliberately left out so it is safe to paste into a client email.
            </div>
          </>
        )}
      </div>
    </div>
  );
}
