import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { useState } from 'react';
import { errorMessage } from '@/api/errors';
import { useApiMutation } from '@/api/hooks';
import { interviewsApi, type Interview } from '@/api/endpoints/interviews';
import { queryKeys } from '@/api/queryKeys';
import { Skeleton } from '@/components/ui/Skeleton';
import { Field } from '@/components/ui/Layout';
import { Modal } from '@/components/ui/Modal';
import { Stars } from '@/components/Stars';
import { toast } from '@/stores/ui.store';
import { Foot } from './Foot';

const CRIT = [
  ['technical', 'Technical skills'],
  ['communication', 'Communication'],
  ['culture', 'Culture fit'],
  ['experience', 'Relevant experience'],
] as const;
const REC = [
  ['strong_yes', 'Strong yes', 'good'],
  ['yes', 'Yes', 'good'],
  ['no', 'No', 'warn'],
  ['strong_no', 'Strong no', 'bad'],
] as const;

export const recBadge = (r?: string) => {
  const x = REC.find((q) => q[0] === r);
  return x ? <span className={'badge ' + x[2]}>{x[1]}</span> : null;
};

const scorecardsKey = (id: string) => [...queryKeys.interviews.all, 'scorecards', id] as const;

export function ScorecardForm({ interview, onClose }: { interview: Interview; onClose: () => void }) {
  const qc = useQueryClient();
  const [v, setV] = useState<{ ratings: Record<string, number>; recommendation: string; comments: string }>({ ratings: {}, recommendation: '', comments: '' });
  const save = useApiMutation(() => interviewsApi.saveScorecard(interview.id, v), {
    onSuccess: () => {
      toast('Feedback saved');
      void qc.invalidateQueries({ queryKey: queryKeys.interviews.all });
      void qc.invalidateQueries({ queryKey: queryKeys.candidates.all });
      onClose();
    },
    onError: (e) => toast(errorMessage(e), 'error'),
  });
  return (
    <Modal
      title="Interview feedback"
      sub={`${interview.application.candidate.name} · ${interview.round || 'Interview'}`}
      onClose={onClose}
      footer={<Foot onClose={onClose} busy={save.isPending} label="Save feedback" onSave={() => save.mutate()} disabled={!v.recommendation || !Object.values(v.ratings).some(Boolean)} />}
    >
      <div style={{ display: 'grid', gap: 10, marginTop: 14 }}>
        {CRIT.map(([k, l]) => (
          <div key={k} style={{ display: 'flex', alignItems: 'center' }}>
            <span style={{ flex: 1 }}>{l}</span>
            <Stars size={22} value={v.ratings[k] || 0} onChange={(n) => setV((s) => ({ ...s, ratings: { ...s.ratings, [k]: n } }))} />
          </div>
        ))}
      </div>
      <div className="field" role="group" aria-labelledby="rec-label">
        <span id="rec-label">Recommendation</span>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8 }}>
          {REC.map(([k, l, t]) => (
            <button
              type="button"
              key={k}
              aria-pressed={v.recommendation === k}
              onClick={() => setV((s) => ({ ...s, recommendation: k }))}
              className="btn"
              style={v.recommendation === k ? { borderColor: `var(--${t})`, background: `var(--${t}-soft)`, color: `var(--${t})`, justifyContent: 'center' } : { justifyContent: 'center' }}
            >
              {l}
            </button>
          ))}
        </div>
      </div>
      <Field label="Comments">
        <textarea className="textarea" style={{ minHeight: 90 }} placeholder="Strengths, concerns, follow-up questions…" value={v.comments} onChange={(e) => setV((s) => ({ ...s, comments: e.target.value }))} />
      </Field>
    </Modal>
  );
}

export function InterviewFeedback({ interview }: { interview: Interview }) {
  const { data, isLoading } = useQuery({ queryKey: scorecardsKey(interview.id), queryFn: () => interviewsApi.scorecards(interview.id) });
  const [form, setForm] = useState(false);
  return (
    <div className="sec">
      <h4>Interview feedback</h4>
      {isLoading ? (
        <Skeleton rows={2} />
      ) : data?.length ? (
        data.map((s) => (
          <div key={s.id} style={{ padding: '10px 0', borderBottom: '1px solid var(--line2)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <b style={{ flex: 1 }}>{s.reviewerName}</b>
              <Stars value={s.overall ?? 0} size={15} />
              {recBadge(s.recommendation)}
            </div>
            {s.comments && <div style={{ color: 'var(--text2)', fontSize: 13, marginTop: 4 }}>{s.comments}</div>}
          </div>
        ))
      ) : (
        <div style={{ color: 'var(--muted)', fontSize: 13 }}>No feedback yet.</div>
      )}
      <button className="btn sm" style={{ marginTop: 10 }} onClick={() => setForm(true)}>
        <Plus size={14} />
        Add my feedback
      </button>
      {form && <ScorecardForm interview={interview} onClose={() => setForm(false)} />}
    </div>
  );
}

export function CandidateScorecards({ id }: { id: string }) {
  const { data } = useQuery({ queryKey: [...queryKeys.candidates.all, 'scorecards', id], queryFn: () => interviewsApi.candidateScorecards(id) });
  return (
    <div className="card">
      <div className="card-h">
        <h3>Interview feedback</h3>
        {data?.average != null && (
          <>
            <Stars value={data.average} size={15} />
            <small>
              {data.average} avg · {data.count}
            </small>
          </>
        )}
      </div>
      <div className="card-b">
        {data?.items?.length ? (
          data.items.map((s) => (
            <div key={s.id} style={{ padding: '10px 0', borderBottom: '1px solid var(--line2)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <b>{s.reviewerName}</b>
                <span style={{ color: 'var(--muted)', fontSize: 12.5 }}>{s.interview?.round}</span>
                <span style={{ flex: 1 }} />
                <Stars value={s.overall ?? 0} size={14} />
                {recBadge(s.recommendation)}
              </div>
              <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>
                {CRIT.filter(([k]) => s.ratings?.[k]).map(([k, l]) => (
                  <span key={k}>
                    {l}: <b style={{ color: 'var(--text2)' }}>{s.ratings?.[k]}/5</b>
                  </span>
                ))}
              </div>
              {s.comments && <div style={{ color: 'var(--text2)', fontSize: 13, marginTop: 4 }}>{s.comments}</div>}
            </div>
          ))
        ) : (
          <div style={{ color: 'var(--muted)' }}>No interview feedback recorded yet. Open an interview on the calendar to add some.</div>
        )}
      </div>
    </div>
  );
}
