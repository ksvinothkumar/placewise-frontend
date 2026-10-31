import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Briefcase, CalendarClock, CalendarX, Check, Clock, Loader2, MapPin, PauseCircle, ThumbsDown, ThumbsUp, Video, type LucideIcon } from 'lucide-react';
import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import type { ClientDecision } from '@/api/endpoints/applications';
import { portalApi, type PortalInterview, type PortalShortlistItem } from '@/api/endpoints/portal';
import { errorMessage } from '@/api/errors';
import { useApiMutation } from '@/api/hooks';
import { queryKeys } from '@/api/queryKeys';
import { Chips, ScoreRing, StageBadge } from '@/components/ui/Badges';
import { EmptyState } from '@/components/ui/EmptyState';
import { Field } from '@/components/ui/Layout';
import { Modal } from '@/components/ui/Modal';
import { Skeleton } from '@/components/ui/Skeleton';
import { colorFor, initials, money } from '@/lib/format';
import { toast } from '@/stores/ui.store';

const DEC: Record<ClientDecision, [string, string, LucideIcon]> = {
  interested: ['Interested', 'good', ThumbsUp],
  hold: ['On hold', 'warn', PauseCircle],
  not_fit: ['Not a fit', 'bad', ThumbsDown],
};
const when = (d: string) => new Date(d).toLocaleString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

function FeedbackModal({ app, decision, onClose }: { app: PortalShortlistItem; decision: ClientDecision; onClose: () => void }) {
  const qc = useQueryClient();
  const [comment, setComment] = useState(app.feedback?.comment || '');
  const [label] = DEC[decision];
  const save = useApiMutation(() => portalApi.feedback(app.applicationId, { decision, comment }), {
    onSuccess: () => {
      toast('Feedback sent to your recruiter');
      void qc.invalidateQueries({ queryKey: queryKeys.portal.all });
      onClose();
    },
    onError: (e) => toast(errorMessage(e), 'error'),
  });
  return (
    <Modal
      title={`${label}: ${app.candidate.name}`}
      sub="Your recruiter is notified straight away"
      onClose={onClose}
      footer={
        <>
          <button className="btn" onClick={onClose}>
            Cancel
          </button>
          <button className="btn primary" onClick={() => save.mutate()} disabled={save.isPending}>
            {save.isPending && <Loader2 size={15} className="spin" />}Send feedback
          </button>
        </>
      }
    >
      <Field label={decision === 'not_fit' ? 'What was missing? (helps us find a better match)' : 'Comments (optional)'}>
        <textarea className="textarea" autoFocus value={comment} onChange={(e) => setComment(e.target.value)} maxLength={1000} placeholder={decision === 'interested' ? 'e.g. Please arrange a call this week' : ''} />
      </Field>
    </Modal>
  );
}

function RespondModal({ iv, response, onClose }: { iv: PortalInterview; response: 'confirm' | 'reschedule'; onClose: () => void }) {
  const qc = useQueryClient();
  const [comment, setComment] = useState('');
  const save = useApiMutation(() => portalApi.respond(iv.id, { response, comment }), {
    onSuccess: () => {
      toast(response === 'confirm' ? 'Interview confirmed' : 'Request sent');
      void qc.invalidateQueries({ queryKey: queryKeys.portal.all });
      onClose();
    },
    onError: (e) => toast(errorMessage(e), 'error'),
  });
  return (
    <Modal
      title={response === 'confirm' ? 'Confirm this interview' : 'Request another time'}
      sub={when(iv.when)}
      onClose={onClose}
      footer={
        <>
          <button className="btn" onClick={onClose}>
            Cancel
          </button>
          <button className="btn primary" onClick={() => save.mutate()} disabled={save.isPending || (response === 'reschedule' && !comment.trim())}>
            {save.isPending && <Loader2 size={15} className="spin" />}Send
          </button>
        </>
      }
    >
      <Field label={response === 'confirm' ? 'Note (optional)' : 'Which times suit you?'}>
        <textarea className="textarea" autoFocus value={comment} onChange={(e) => setComment(e.target.value)} maxLength={500} />
      </Field>
    </Modal>
  );
}

export function PortalJobPage() {
  const { id = '' } = useParams();
  const { data, isLoading, isError } = useQuery({ queryKey: [...queryKeys.portal.all, 'job', id], queryFn: () => portalApi.job(id) });
  const [fb, setFb] = useState<{ app: PortalShortlistItem; decision: ClientDecision } | null>(null);
  const [rs, setRs] = useState<{ iv: PortalInterview; response: 'confirm' | 'reschedule' } | null>(null);
  if (isLoading) return <div className="card"><Skeleton rows={8} /></div>;
  if (isError || !data) return <EmptyState title="Role not found" />;
  const { job, shortlist } = data;
  return (
    <>
      <Link to="/portal" style={{ display: 'inline-flex', gap: 6, alignItems: 'center', color: 'var(--text2)', marginBottom: 14 }}>
        <ArrowLeft size={15} />
        All roles
      </Link>
      <div className="card">
        <div className="card-b">
          <h1 style={{ fontSize: 22, letterSpacing: '-.02em' }}>{job.title}</h1>
          <div className="meta" style={{ marginTop: 6 }}>
            <span>
              <MapPin size={14} />
              {job.city}
              {job.remote && ' · Remote OK'}
            </span>
            <span>
              <Briefcase size={14} />
              {job.expMin}–{job.expMax} yrs
            </span>
            <span>
              <Clock size={14} />
              {job.openings} opening{job.openings > 1 ? 's' : ''}
            </span>
          </div>
          <div style={{ marginTop: 10 }}>
            <Chips items={job.skills} />
          </div>
        </div>
      </div>
      <h3 style={{ margin: '24px 0 12px' }}>
        Shortlisted candidates <span style={{ color: 'var(--muted)', fontWeight: 400 }}>({shortlist.length})</span>
      </h3>
      {!shortlist.length ? (
        <div className="card">
          <EmptyState title="No candidates submitted yet" sub="We'll notify you as soon as we send you a shortlist." />
        </div>
      ) : (
        <div className="grid cols-2">
          {shortlist.map((s) => {
            const c = s.candidate;
            const f = s.feedback;
            return (
              <div key={s.applicationId} className="card">
                <div className="card-b">
                  <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                    <div className="avatar" style={{ width: 46, height: 46, fontSize: 16, background: colorFor(c.name) }}>
                      {initials(c.name)}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <b style={{ fontSize: 16 }}>{c.name}</b>
                      <div style={{ color: 'var(--text2)', fontSize: 13 }}>
                        {c.title}
                        {c.city && ` · ${c.city}`}
                      </div>
                    </div>
                    {c.score != null && <ScoreRing score={c.score} size={46} />}
                  </div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', margin: '12px 0' }}>
                    <StageBadge stage={s.stage} />
                    <span className="badge">{c.exp} yrs</span>
                    <span className="badge">Expects {money(c.expected)}</span>
                    <span className="badge">{c.notice}d notice</span>
                  </div>
                  <Chips items={c.skills} max={8} />
                  {c.summary && <p style={{ color: 'var(--text2)', fontSize: 13.5, margin: '8px 0 0' }}>{c.summary}</p>}
                  {c.education && <div style={{ color: 'var(--muted)', fontSize: 12.5, marginTop: 6 }}>{c.education}</div>}
                  {s.interviews.map((iv) => (
                    <div key={iv.id} style={{ marginTop: 12, padding: 12, borderRadius: 10, background: 'var(--surface2)', border: '1px solid var(--line)' }}>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                        <CalendarClock size={16} color="var(--brand)" />
                        <b>{when(iv.when)}</b>
                        <span style={{ color: 'var(--muted)', fontSize: 12.5 }}>
                          {iv.round} · {iv.mode}
                        </span>
                      </div>
                      {iv.location && /^https?:/.test(iv.location) && (
                        <a href={iv.location} target="_blank" rel="noreferrer" style={{ fontSize: 12.5, color: 'var(--brand-text)' }}>
                          <Video size={12} /> Join link
                        </a>
                      )}
                      <div style={{ display: 'flex', gap: 8, marginTop: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                        {iv.response ? <span className={'badge ' + (iv.response.response === 'confirm' ? 'good' : 'warn')}>{iv.response.response === 'confirm' ? 'You confirmed' : 'You asked for another time'}</span> : null}
                        <button className="btn sm" onClick={() => setRs({ iv, response: 'confirm' })}>
                          <Check size={13} />
                          Confirm
                        </button>
                        <button className="btn sm" onClick={() => setRs({ iv, response: 'reschedule' })}>
                          <CalendarX size={13} />
                          Another time
                        </button>
                      </div>
                    </div>
                  ))}
                  <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px solid var(--line2)' }}>
                    {f && (
                      <div style={{ marginBottom: 8, fontSize: 13 }}>
                        <span className={'badge ' + DEC[f.decision][1]}>{DEC[f.decision][0]}</span>{' '}
                        <span style={{ color: 'var(--muted)' }}>{new Date(f.at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>
                        {f.comment && <div style={{ color: 'var(--text2)', marginTop: 3 }}>"{f.comment}"</div>}
                      </div>
                    )}
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      {(Object.entries(DEC) as [ClientDecision, [string, string, LucideIcon]][]).map(([k, [l, t, I]]) => (
                        <button
                          key={k}
                          className="btn sm"
                          aria-pressed={f?.decision === k}
                          style={f?.decision === k ? { borderColor: `var(--${t})`, background: `var(--${t}-soft)`, color: `var(--${t})` } : undefined}
                          onClick={() => setFb({ app: s, decision: k })}
                        >
                          <I size={13} />
                          {l}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
      {fb && <FeedbackModal app={fb.app} decision={fb.decision} onClose={() => setFb(null)} />}
      {rs && <RespondModal iv={rs.iv} response={rs.response} onClose={() => setRs(null)} />}
    </>
  );
}
