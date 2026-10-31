import { useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft, Briefcase, CalendarClock, Camera, Download, FileText, Link2, ListChecks, Mail, MapPin, MessageCircle, Pencil, Phone, Plus, Printer, Save, ShieldCheck, Trash2, Video,
  type LucideIcon,
} from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import type { JobRef } from '@/api/endpoints/applications';
import { applicationsApi } from '@/api/endpoints/applications';
import { candidatesApi } from '@/api/endpoints/candidates';
import { errorMessage } from '@/api/errors';
import { useApiMutation } from '@/api/hooks';
import { useCandidate, useCandidateTasks } from '@/api/queries/candidates';
import { queryKeys } from '@/api/queryKeys';
import { ActivityFeed } from '@/components/business/ActivityFeed';
import { EmailComposer } from '@/components/business/EmailComposer';
import { OfferBox } from '@/components/business/Offers';
import { CandidateScorecards } from '@/components/business/Scorecards';
import { TagEditor } from '@/components/business/TagEditor';
import { TaskForm } from '@/components/business/TaskForm';
import { Timeline } from '@/components/business/Timeline';
import { CandidateEdit } from '@/components/forms';
import { PhotoEditor } from '@/components/PhotoEditor';
import { ResumePanel } from '@/components/ResumeViewer';
import { CandidatePhoto, Chips, Empty, ScoreRing, Skeleton, StageBadge } from '@/components/ui';
import { fmtDT, isTerminalStage, money, stageColor, stageKind, waLink } from '@/lib/format';
import { useCan } from '@/lib/permissions';
import { useSessionStore } from '@/stores/session.store';
import { toast } from '@/stores/ui.store';
import { ClientSummaryCard } from './ClientSummaryCard';

const fmtDate = (d: string) => new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
const Row = ({ icon: I, children }: { icon: LucideIcon; children?: ReactNode }) =>
  children ? (
    <span style={{ display: 'inline-flex', gap: 7, alignItems: 'center' }}>
      <I size={15} color="var(--muted)" />
      {children}
    </span>
  ) : null;
const Fact = ({ label, value }: { label: string; value?: ReactNode }) => (
  <div>
    <span>{label}</span>
    <b>{value || '—'}</b>
  </div>
);
const FEEDBACK = { interested: ['good', 'Interested'], hold: ['warn', 'On hold'], not_fit: ['bad', 'Not a fit'] } as const;

export function CandidateProfilePage() {
  const { id = '' } = useParams();
  const nav = useNavigate();
  const qc = useQueryClient();
  const user = useSessionStore((s) => s.user);
  const canWrite = useCan('candidates:write');
  const canDelete = useCan('candidates:delete');
  const { data: c, isLoading, error } = useCandidate(id);
  const tasks = useCandidateTasks(id);
  const [taskForm, setTaskForm] = useState(false);
  const [mailForm, setMailForm] = useState(false);
  const [edit, setEdit] = useState(false);
  const [photo, setPhoto] = useState(false);
  const [notes, setNotes] = useState('');
  useEffect(() => {
    if (c) setNotes(c.notes || '');
    // reset the draft only when the server record changes, not on every keystroke
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [c?.id, c?.updatedAt]);

  const refresh = [queryKeys.candidates.all, queryKeys.applications.all, queryKeys.jobs.all];
  const err = (e: unknown) => toast(errorMessage(e), 'error');
  const setConsent = useApiMutation((given: boolean) => candidatesApi.setConsent(id, given), {
    invalidate: refresh,
    onSuccess: (_r, given) => toast(given ? 'Consent recorded' : 'Consent withdrawn'),
    onError: err,
  });
  const add = useApiMutation((job: string) => applicationsApi.add(id, job), { invalidate: refresh, onSuccess: () => toast('Added to pipeline'), onError: err });
  const saveNotes = useApiMutation(() => candidatesApi.update(id, { notes }), { invalidate: refresh, onSuccess: () => toast('Notes saved'), onError: err });

  if (isLoading && !c)
    return (
      <div className="card">
        <Skeleton rows={10} />
      </div>
    );
  if (error || !c)
    return (
      <>
        <Link to="/candidates" className="back">
          <ArrowLeft size={15} />
          Talent pool
        </Link>
        <div className="card">
          <Empty title="Candidate not found" />
        </div>
      </>
    );

  const exportData = async () => {
    try {
      const d = await candidatesApi.exportData(id);
      const url = URL.createObjectURL(new Blob([JSON.stringify(d, null, 2)], { type: 'application/json' }));
      Object.assign(document.createElement('a'), { href: url, download: `${c.name.replace(/\W+/g, '-')}-data.json` }).click();
      setTimeout(() => URL.revokeObjectURL(url), 2000);
      toast('Data exported');
    } catch (e) {
      err(e);
    }
  };
  const del = async () => {
    if (!confirm('Delete this candidate and all their applications?')) return;
    try {
      await candidatesApi.remove(id);
      toast('Candidate deleted');
      nav('/candidates');
      await Promise.all(refresh.map((queryKey) => qc.invalidateQueries({ queryKey })));
    } catch (e) {
      err(e);
    }
  };
  const active = c.applications.filter((a) => !isTerminalStage(a.stage)).length;
  const wa = waLink(c.phone, `Hi ${c.name.split(' ')[0]}, this is ${user?.name ?? 'your recruiter'} from Placewise. `);

  return (
    <>
      <Link to="/candidates" className="back no-print" style={{ display: 'inline-flex', gap: 6, alignItems: 'center', color: 'var(--text2)', marginBottom: 14 }}>
        <ArrowLeft size={15} />
        Talent pool
      </Link>

      <div className="card">
        <div className="card-b" style={{ display: 'flex', gap: 28, flexWrap: 'wrap', alignItems: 'flex-start' }}>
          <div style={{ position: 'relative' }}>
            <CandidatePhoto c={c} size={140} passport />
            {canWrite && (
              <button
                className="iconbtn no-print"
                style={{ position: 'absolute', right: -10, bottom: -10, width: 36, height: 36, borderRadius: '50%', boxShadow: 'var(--sh2)' }}
                onClick={() => setPhoto(true)}
                title="Change photo"
                aria-label="Change photo"
              >
                <Camera size={16} />
              </button>
            )}
          </div>
          <div style={{ flex: 1, minWidth: 280 }}>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
              <h1 style={{ fontSize: 26, letterSpacing: '-.02em' }}>{c.name}</h1>
              {active > 0 ? (
                <span className="badge brand">
                  {active} active pipeline{active > 1 ? 's' : ''}
                </span>
              ) : (
                <span className="badge">Available</span>
              )}
              {c.relocate && <span className="badge info">Open to relocate</span>}
            </div>
            <div style={{ color: 'var(--text2)', fontSize: 15, marginTop: 3 }}>
              {c.title}
              {c.company && ` at ${c.company}`}
            </div>
            <div style={{ display: 'flex', gap: '10px 22px', flexWrap: 'wrap', marginTop: 16, color: 'var(--text2)', fontSize: 13.5 }}>
              <Row icon={Mail}>{c.email && <a href={'mailto:' + c.email}>{c.email}</a>}</Row>
              <Row icon={Phone}>{c.phone && <a href={'tel:' + c.phone.replace(/\s/g, '')}>{c.phone}</a>}</Row>
              <Row icon={MapPin}>{c.city}</Row>
              <Row icon={Link2}>
                {c.linkedin && (
                  <a href={c.linkedin.startsWith('http') ? c.linkedin : 'https://' + c.linkedin} target="_blank" rel="noreferrer">
                    {c.linkedin.replace(/^https?:\/\/(www\.)?/, '')}
                  </a>
                )}
              </Row>
            </div>
            <div className="kv" style={{ gridTemplateColumns: 'repeat(4,minmax(0,1fr))', marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--line2)' }}>
              <Fact label="Experience" value={`${c.exp} yrs`} />
              <Fact label="Expected CTC" value={money(c.expected)} />
              <Fact label="Current CTC" value={c.currentCtc ? money(c.currentCtc) : ''} />
              <Fact label="Notice period" value={`${c.notice} days`} />
            </div>
          </div>
          <div className="no-print" style={{ display: 'flex', gap: 8, flexDirection: 'column' }}>
            {canWrite && (
              <button className="btn" onClick={() => setMailForm(true)}>
                <Mail size={15} />
                Send email
              </button>
            )}
            {canWrite && (
              <button className="btn primary" onClick={() => setEdit(true)}>
                <Pencil size={15} />
                Edit profile
              </button>
            )}
            {wa && (
              <a className="btn" style={{ color: '#128c7e' }} href={wa} target="_blank" rel="noreferrer">
                <MessageCircle size={15} />
                WhatsApp
              </a>
            )}
            <button className="btn" onClick={() => window.print()}>
              <Printer size={15} />
              Print / PDF
            </button>
            <button className="btn" onClick={exportData}>
              <Download size={15} />
              Export data
            </button>
            {canDelete && (
              <button className="btn danger" onClick={del}>
                <Trash2 size={15} />
                Delete
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="grid cols-3" style={{ marginTop: 18 }}>
        <div style={{ display: 'grid', gap: 18, alignContent: 'start' }}>
          <div className="card">
            <div className="card-h">
              <h3>Professional summary</h3>
            </div>
            <div className="card-b" style={{ color: 'var(--text2)', whiteSpace: 'pre-wrap' }}>
              {c.summary || <span style={{ color: 'var(--muted)' }}>No summary yet. Use Edit profile to add one.</span>}
            </div>
          </div>
          <div className="card" id="resume">
            <div className="card-h">
              <FileText size={17} color="var(--brand)" />
              <h3>Resume</h3>
            </div>
            <div className="card-b">
              <ResumePanel c={c} height={680} />
            </div>
          </div>
          <div className="card">
            <div className="card-h">
              <h3>Skills</h3>
              <small>{c.skills.length}</small>
            </div>
            <div className="card-b">
              <Chips items={c.skills} />
              <div style={{ marginTop: 10, paddingTop: 12, borderTop: '1px solid var(--line2)' }}>
                <TagEditor candidate={c} />
              </div>
            </div>
          </div>
          <div className="card">
            <div className="card-h">
              <Briefcase size={17} color="var(--brand)" />
              <h3>Applications</h3>
              <small>{c.applications.length}</small>
            </div>
            <div className="card-b">
              {c.applications.length ? (
                c.applications.map((a) => {
                  const hist = a.history ?? [];
                  const fb = a.clientFeedback?.decision ? FEEDBACK[a.clientFeedback.decision] : null;
                  return (
                    <div key={a.id} style={{ padding: '12px 0', borderBottom: '1px solid var(--line2)' }}>
                      <div className="who">
                        <ScoreRing score={a.score} size={40} />
                        <div style={{ flex: 1 }}>
                          <b>
                            <Link to={'/jobs/' + a.job.id}>{a.job.title}</Link>
                          </b>
                          <span>
                            {a.job.client?.name} · applied {fmtDate(a.createdAt)}
                          </span>
                        </div>
                        <StageBadge stage={a.stage} />
                      </div>
                      {fb && a.clientFeedback && (
                        <div style={{ marginTop: 8, marginLeft: 52, fontSize: 13 }}>
                          <span className={'badge ' + fb[0]}>Client: {fb[1]}</span>{' '}
                          {a.clientFeedback.comment && <span style={{ color: 'var(--text2)' }}>"{a.clientFeedback.comment}"</span>}{' '}
                          <span style={{ color: 'var(--muted)' }}>· {a.clientFeedback.by}</span>
                        </div>
                      )}
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 10, marginLeft: 52 }}>
                        {hist.length > 6 && <span style={{ fontSize: 12, color: 'var(--muted)' }}>+{hist.length - 6} earlier ·</span>}
                        {hist.slice(-6).map((h, i, arr) => (
                          <span key={i} style={{ fontSize: 12, color: 'var(--text2)', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                            <i className="dot" style={{ color: stageColor(h.stage) }} />
                            {h.stage} · {fmtDate(h.at)}
                            {i < arr.length - 1 && <span style={{ color: 'var(--muted)', marginLeft: 4 }}>→</span>}
                          </span>
                        ))}
                      </div>
                      {!['rejected', 'start'].includes(stageKind(a.stage)) && (
                        <OfferBox
                          application={a}
                          offer={c.offers?.find((o) => o.application === a.id)}
                          candidate={c}
                          job={a.job as unknown as JobRef}
                        />
                      )}
                    </div>
                  );
                })
              ) : (
                <Empty title="Not in any pipeline" sub="Add this candidate to a job from the suggestions." />
              )}
            </div>
          </div>
          <ClientSummaryCard candidate={c} applications={c.applications} />
          <CandidateScorecards id={id} />
          <ActivityFeed entityType="candidate" entityId={id} title="Notes, calls & comments" canLog={canWrite} />
          <Timeline id={id} />
          <div className="card">
            <div className="card-h">
              <CalendarClock size={17} color="var(--brand)" />
              <h3>Interviews</h3>
            </div>
            <div className="card-b">
              {c.interviews?.length ? (
                <ul className="list">
                  {c.interviews.map((i) => (
                    <li key={i.id}>
                      <div className="ic">
                        <Video size={15} />
                      </div>
                      <div>
                        <b>{i.round}</b> · {i.jobTitle}
                        <div style={{ color: 'var(--muted)', fontSize: 12.5 }}>
                          {fmtDT(i.when)} · {i.mode} · {i.interviewer}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <Empty title="No interviews" />
              )}
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gap: 18, alignContent: 'start' }}>
          <div className="card no-print">
            <div className="card-h">
              <ListChecks size={17} color="var(--brand)" />
              <h3>Tasks</h3>
              <button className="btn sm" style={{ marginLeft: 'auto' }} onClick={() => setTaskForm(true)}>
                <Plus size={13} />
                Add
              </button>
            </div>
            <div className="card-b">
              {tasks.data?.length ? (
                <ul className="list">
                  {tasks.data.map((t) => (
                    <li key={t.id}>
                      <div style={{ flex: 1 }}>
                        <b>{t.title}</b>
                        <div style={{ fontSize: 12.5, color: t.overdue ? 'var(--bad)' : 'var(--muted)' }}>
                          {t.due ? new Date(t.due).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : 'No due date'} ·{' '}
                          {t.assignee?.name}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <div style={{ color: 'var(--muted)', fontSize: 13 }}>No open tasks for this candidate.</div>
              )}
            </div>
          </div>
          <div className="card">
            <div className="card-h">
              <h3>Details</h3>
            </div>
            <div className="card-b">
              <div className="kv">
                <Fact label="Location" value={c.city} />
                <Fact label="Source" value={c.source} />
                <Fact label="Education" value={c.education} />
                <Fact label="Relocation" value={c.relocate ? 'Open' : 'Not open'} />
                <Fact label="Data consent" value={c.consent?.given ? 'Given · ' + fmtDate(c.consent.at ?? '') : c.consent?.at ? 'Withdrawn' : 'Not recorded'} />
                <Fact label="Added" value={c.createdAt ? fmtDate(c.createdAt) : ''} />
                <Fact label="Last updated" value={c.updatedAt ? fmtDate(c.updatedAt) : ''} />
              </div>
              {canWrite && (
                <div className="no-print" style={{ marginTop: 12 }}>
                  {c.consent?.given ? (
                    <button className="btn sm" onClick={() => setConsent.mutate(false)}>
                      <ShieldCheck size={13} />
                      Withdraw consent
                    </button>
                  ) : (
                    <button className="btn sm" onClick={() => setConsent.mutate(true)}>
                      <ShieldCheck size={13} />
                      Record consent
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
          <div className="card no-print">
            <div className="card-h">
              <h3>Best-fit open jobs</h3>
            </div>
            <div className="card-b">
              {c.bestJobs.map((b) => (
                <div key={b.job.id} className="who" style={{ padding: '9px 0', borderBottom: '1px solid var(--line2)' }}>
                  <ScoreRing score={b.score} size={40} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <b>{b.job.title}</b>
                    <span>
                      {b.job.client?.name}
                      {b.notes.length ? ' · ' + b.notes[0] : ' · Strong fit'}
                    </span>
                  </div>
                  {b.inPipeline ? (
                    <span className="badge">In pipeline</span>
                  ) : (
                    <button className="btn sm primary" aria-label={`Add to ${b.job.title}`} onClick={() => add.mutate(b.job.id)}>
                      <Plus size={14} />
                      Add
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
          <div className="card">
            <div className="card-h">
              <h3>Recruiter notes</h3>
            </div>
            <div className="card-b">
              <textarea
                className="textarea"
                aria-label="Recruiter notes"
                placeholder="Private notes: call feedback, preferences, red flags…"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                readOnly={!canWrite}
              />
              {canWrite && (
                <button className="btn sm no-print" style={{ marginTop: 10 }} disabled={saveNotes.isPending || notes === (c.notes || '')} onClick={() => saveNotes.mutate()}>
                  <Save size={14} />
                  Save notes
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
      {mailForm && <EmailComposer candidate={c} applications={c.applications} onClose={() => setMailForm(false)} />}
      {taskForm && <TaskForm candidate={c} onClose={() => setTaskForm(false)} />}
      {edit && <CandidateEdit c={c} onClose={() => setEdit(false)} />}
      {photo && <PhotoEditor c={c} onClose={() => setPhoto(false)} onSaved={() => void qc.invalidateQueries({ queryKey: queryKeys.candidates.all })} />}
    </>
  );
}
