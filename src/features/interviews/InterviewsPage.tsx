import { useQuery } from '@tanstack/react-query';
import { CalendarDays, CalendarPlus, ChevronLeft, ChevronRight, Copy, Eye, ExternalLink, LayoutGrid, List, Mail, MapPin, Pencil, Phone, Plus, Send, Video, XCircle, type LucideIcon } from 'lucide-react';
import { useMemo, useState } from 'react';
import { interviewsApi, type Interview } from '@/api/endpoints/interviews';
import { InterviewFeedback } from '@/components/business/Scorecards';
import { CandidateDrawer } from '@/components/business/CandidateDrawer';
import { CandidatePhoto } from '@/components/ui/Avatar';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageHead } from '@/components/ui/Layout';
import { Drawer, Modal } from '@/components/ui/Modal';
import { Skeleton } from '@/components/ui/Skeleton';
import { addDays, dayKey, longDay, monday, shortDT, sod } from '@/lib/dates';
import { fmtTime } from '@/lib/format';
import { toast } from '@/stores/ui.store';
import { InvitePreview } from './InvitePreview';
import { ScheduleForm } from './ScheduleForm';
import { useCancelInterview, useInterviewRange, useSendInvite } from './useInterviews';

const MODE: Record<string, { I: LucideIcon; c: string }> = { Video: { I: Video, c: '#4f46e5' }, Phone: { I: Phone, c: '#d97706' }, 'In-person': { I: MapPin, c: '#059669' } };
const modeOf = (m: string) => MODE[m] ?? MODE.Video!;
const BADGE: Record<string, [string, string]> = { sent: ['good', 'Invite sent'], simulated: ['warn', 'Invite prepared'], failed: ['bad', 'Invite failed'], skipped: ['', 'No email'] };
const DOW = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const short = (n: string) => {
  const [f, ...r] = n.split(' ');
  return r.length ? `${f} ${r[r.length - 1]![0]}.` : f;
};

type View = 'month' | 'week' | 'list';
function range(view: View, cursor: Date) {
  if (view === 'month') {
    const from = monday(new Date(cursor.getFullYear(), cursor.getMonth(), 1));
    return { from, to: addDays(from, 42) };
  }
  if (view === 'week') {
    const from = monday(cursor);
    return { from, to: addDays(from, 7) };
  }
  return { from: sod(new Date()), to: addDays(sod(new Date()), 183) };
}

const InviteBadge = ({ s }: { s?: string | null }) => {
  const bd = s ? BADGE[s] : undefined;
  return bd ? (
    <span className={'badge ' + bd[0]}>
      <Mail size={11} />
      {bd[1]}
    </span>
  ) : (
    <span className="badge">Not invited</span>
  );
};

function Pill({ i, onSelect }: { i: Interview; onSelect: (id: string) => void }) {
  const M = modeOf(i.mode);
  const past = new Date(i.when).getTime() < Date.now();
  return (
    <button
      className="ev"
      style={{ '--c': M.c, opacity: past ? 0.6 : 1 } as React.CSSProperties}
      onClick={(e) => {
        e.stopPropagation();
        onSelect(i.id);
      }}
      title={`${i.application.candidate.name} · ${i.application.job.title}`}
    >
      <b>{fmtTime(i.when)}</b>
      <span>{short(i.application.candidate.name)}</span>
      {i.inviteStatus === 'sent' && <Mail size={10} />}
    </button>
  );
}

function Card({ i, onSelect }: { i: Interview; onSelect: (id: string) => void }) {
  const M = modeOf(i.mode);
  const c = i.application.candidate;
  return (
    <div className="icard" style={{ '--c': M.c } as React.CSSProperties} role="button" tabIndex={0} onClick={() => onSelect(i.id)} onKeyDown={(e) => e.key === 'Enter' && onSelect(i.id)}>
      <div className="when">
        <b>{fmtTime(i.when)}</b>
        <span>{i.duration || 60}m</span>
      </div>
      <CandidatePhoto c={c} size={38} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <b style={{ display: 'block' }}>{c.name}</b>
        <span style={{ color: 'var(--muted)', fontSize: 12.5 }}>
          {i.application.job.title} · {i.application.job.client?.name}
        </span>
      </div>
      <div style={{ textAlign: 'right', fontSize: 12.5, color: 'var(--text2)' }}>
        <span style={{ display: 'inline-flex', gap: 5, alignItems: 'center', color: M.c, fontWeight: 600 }}>
          <M.I size={13} />
          {i.mode}
        </span>
        <br />
        {i.round} · {i.interviewer}
      </div>
      <InviteBadge s={i.inviteStatus} />
    </div>
  );
}

export function InterviewsPage() {
  const [view, setView] = useState<View>('month');
  const [cursor, setCursor] = useState(() => new Date());
  const [sub, setSub] = useState<string | null>(null);
  const [form, setForm] = useState<{ date?: string; interview?: Interview } | null>(null);
  const [sel, setSel] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [candId, setCandId] = useState<string | null>(null);
  const [dayOpen, setDayOpen] = useState<string | null>(null);

  const { from, to } = useMemo(() => range(view, cursor), [view, cursor]);
  const { data, isLoading } = useInterviewRange(from, to);
  const today0 = sod(new Date());
  const stats = useInterviewRange(today0, addDays(today0, 183));
  const items = useMemo(() => data ?? [], [data]);
  const up = stats.data ?? [];
  const byDay = useMemo(() => {
    const m: Record<string, Interview[]> = {};
    items.forEach((i) => (m[dayKey(i.when)] ??= []).push(i));
    return m;
  }, [items]);
  const selected = sel ? [...items, ...up].find((i) => i.id === sel) : undefined;
  const cancel = useCancelInterview(() => setSel(null));
  const sendInvite = useSendInvite();
  const now = Date.now();

  const step = (n: number) => setCursor((c) => (view === 'month' ? new Date(c.getFullYear(), c.getMonth() + n, 1) : addDays(c, 7 * n)));
  const label =
    view === 'month'
      ? cursor.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })
      : view === 'week'
        ? `${from.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} – ${addDays(to, -1).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}`
        : 'Upcoming (next 6 months)';
  const kpi: [string, number][] = [
    ['Today', up.filter((i) => dayKey(i.when) === dayKey(now)).length],
    ['Next 7 days', up.filter((i) => +new Date(i.when) < +addDays(today0, 7)).length],
    ['Next 30 days', up.filter((i) => +new Date(i.when) < +addDays(today0, 30)).length],
    ['Invite pending', up.filter((i) => !i.inviteStatus || i.inviteStatus === 'failed').length],
  ];
  const doCancel = (x: Interview) => {
    const notify = ['sent', 'simulated'].includes(x.inviteStatus ?? '');
    if (!confirm(notify ? `Cancel this interview? A cancellation email will be sent to ${x.application.candidate.email}.` : 'Cancel this interview?')) return;
    cancel.mutate(x);
  };
  const subLink = useQuery({ queryKey: ['calendar-link'], queryFn: interviewsApi.calendarLink, enabled: false });
  const openSub = async () => setSub((await subLink.refetch()).data?.path ?? null);
  const origin = typeof location === 'undefined' ? '' : location.origin;

  const upByDay = up.reduce<Record<string, Interview[]>>((m, i) => ((m[dayKey(i.when)] ??= []).push(i), m), {});

  return (
    <>
      <PageHead title="Interviews" sub="Plan and track every interview across all months">
        <button className="btn" onClick={() => void openSub()}>
          <CalendarPlus size={16} />
          Subscribe
        </button>
        <button className="btn primary" onClick={() => setForm({})}>
          <Plus size={16} />
          Schedule interview
        </button>
      </PageHead>

      <div className="grid kpis" style={{ marginBottom: 18, gridTemplateColumns: 'repeat(auto-fit,minmax(170px,1fr))' }}>
        {kpi.map(([l, n]) => (
          <div className="card" key={l} style={{ padding: '14px 18px' }}>
            <div style={{ color: 'var(--text2)', fontSize: 12.5 }}>{l}</div>
            <div style={{ fontSize: 26, fontWeight: 700, letterSpacing: '-.02em' }}>{n}</div>
          </div>
        ))}
      </div>

      <div className="card">
        <div className="toolbar" style={{ justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {view !== 'list' && (
              <>
                <button className="iconbtn" onClick={() => step(-1)} aria-label="Previous">
                  <ChevronLeft size={17} />
                </button>
                <button className="iconbtn" onClick={() => step(1)} aria-label="Next">
                  <ChevronRight size={17} />
                </button>
                <button className="btn" onClick={() => setCursor(new Date())}>
                  Today
                </button>
              </>
            )}
            <h3 style={{ fontSize: 17, marginLeft: 6 }}>{label}</h3>
          </div>
          <div className="seg">
            {(
              [
                ['month', 'Month', LayoutGrid],
                ['week', 'Week', CalendarDays],
                ['list', 'List', List],
              ] as const
            ).map(([k, l, I]) => (
              <button key={k} className={view === k ? 'on' : ''} onClick={() => setView(k)}>
                <I size={14} />
                {l}
              </button>
            ))}
          </div>
        </div>

        {isLoading && !data ? (
          <Skeleton rows={8} />
        ) : view === 'month' ? (
          <div className="mcal">
            {DOW.map((d) => (
              <div key={d} className="dow">
                {d}
              </div>
            ))}
            {Array.from({ length: 42 }, (_, n) => {
              const d = addDays(from, n);
              const k = dayKey(d);
              const list = byDay[k] ?? [];
              const out = d.getMonth() !== cursor.getMonth();
              return (
                <div key={k} className={'cell ' + (out ? 'out ' : '') + (k === dayKey(now) ? 'today' : '')} onClick={() => setForm({ date: k })}>
                  <div className="num">
                    {d.getDate()}
                    {list.length > 0 && <span className="n">{list.length}</span>}
                  </div>
                  {list.slice(0, 3).map((i) => (
                    <Pill key={i.id} i={i} onSelect={setSel} />
                  ))}
                  {list.length > 3 && (
                    <button
                      className="more"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDayOpen(k);
                      }}
                    >
                      +{list.length - 3} more
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        ) : view === 'week' ? (
          <div className="week" style={{ padding: 16 }}>
            {Array.from({ length: 7 }, (_, n) => {
              const d = addDays(from, n);
              const k = dayKey(d);
              const list = byDay[k] ?? [];
              return (
                <div key={k} className={'day ' + (k === dayKey(now) ? 'today' : '')}>
                  <h4>
                    <b style={{ color: 'var(--text)' }}>{d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric' })}</b>
                    {k === dayKey(now) ? <span className="badge brand">Today</span> : d.toLocaleDateString('en-IN', { month: 'short' })}
                  </h4>
                  {list.map((i) => {
                    const M = modeOf(i.mode);
                    return (
                      <div key={i.id} className="slot" style={{ borderColor: M.c, cursor: 'pointer' }} role="button" tabIndex={0} onClick={() => setSel(i.id)} onKeyDown={(e) => e.key === 'Enter' && setSel(i.id)}>
                        <b>
                          {fmtTime(i.when)} · {i.application.candidate.name}
                        </b>
                        <span>{i.application.job.title}</span>
                        <br />
                        <span style={{ display: 'inline-flex', gap: 5, alignItems: 'center' }}>
                          <M.I size={12} />
                          {i.round}
                        </span>
                      </div>
                    );
                  })}
                  {!list.length && (
                    <button className="more" onClick={() => setForm({ date: k })}>
                      + Add
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div style={{ padding: '4px 18px 18px' }}>
            {up.length ? (
              Object.entries(upByDay).map(([k, list]) => (
                <div key={k}>
                  <div className="ghead">
                    {longDay(k + 'T00:00')}
                    {k === dayKey(now) && (
                      <span className="badge brand" style={{ marginLeft: 8 }}>
                        Today
                      </span>
                    )}
                    <span style={{ color: 'var(--muted)', fontWeight: 400, marginLeft: 'auto' }}>
                      {list.length} interview{list.length > 1 ? 's' : ''}
                    </span>
                  </div>
                  {list.map((i) => (
                    <Card key={i.id} i={i} onSelect={setSel} />
                  ))}
                </div>
              ))
            ) : (
              <EmptyState title="No upcoming interviews" sub="Schedule one to see it here." />
            )}
          </div>
        )}
      </div>

      {dayOpen && (
        <Drawer
          onClose={() => setDayOpen(null)}
          header={
            <>
              <b style={{ fontSize: 17 }}>{longDay(dayOpen + 'T00:00')}</b>
              <div style={{ color: 'var(--muted)', fontSize: 13 }}>{(byDay[dayOpen] ?? []).length} interviews</div>
            </>
          }
        >
          {(byDay[dayOpen] ?? []).map((i) => (
            <Card key={i.id} i={i} onSelect={setSel} />
          ))}
          <button
            className="btn"
            style={{ marginTop: 14 }}
            onClick={() => {
              setForm({ date: dayOpen });
              setDayOpen(null);
            }}
          >
            <Plus size={15} />
            Schedule on this day
          </button>
        </Drawer>
      )}

      {selected && <InterviewDrawer i={selected} onClose={() => setSel(null)} onEdit={() => setForm({ interview: selected })} onPreview={() => setPreview(selected.id)} onCandidate={() => setCandId(selected.application.candidate.id)} onSend={() => sendInvite.mutate(selected)} onCancel={() => doCancel(selected)} />}

      {sub && (
        <Modal
          title="Subscribe in your calendar"
          sub="A live, read-only feed of all interviews that your calendar app refreshes automatically"
          onClose={() => setSub(null)}
          footer={
            <>
              <button className="btn" onClick={() => void interviewsApi.resetCalendarLink().then((r) => setSub(r.path))}>
                Reset link
              </button>
              <button className="btn primary" onClick={() => setSub(null)}>
                Done
              </button>
            </>
          }
        >
          <div className="code" style={{ marginTop: 14, display: 'flex', gap: 10, alignItems: 'center' }}>
            <span style={{ flex: 1, wordBreak: 'break-all' }}>{origin + sub}</span>
            <button
              className="btn sm"
              onClick={() => {
                void navigator.clipboard.writeText(origin + sub);
                toast('Link copied');
              }}
            >
              <Copy size={13} />
              Copy
            </button>
          </div>
          <ul style={{ color: 'var(--text2)', fontSize: 13.5, lineHeight: 1.8, paddingLeft: 18 }}>
            <li>
              <b>Apple Calendar / Outlook:</b> add a calendar from URL and paste the link.
            </li>
            <li>
              <b>Google Calendar:</b> Other calendars → From URL. Google needs the link to be reachable from the internet, so this works once Placewise is deployed (not on localhost).
            </li>
          </ul>
          <div className="banner warn">Anyone with this link can see interview details. Use Reset link if it is shared by mistake.</div>
        </Modal>
      )}
      {form && <ScheduleForm initialDate={form.date} interview={form.interview} onClose={() => setForm(null)} />}
      {preview && <InvitePreview interviewId={preview} onClose={() => setPreview(null)} />}
      {candId && <CandidateDrawer id={candId} onClose={() => setCandId(null)} />}
    </>
  );
}

function InterviewDrawer({ i, onClose, onEdit, onPreview, onCandidate, onSend, onCancel }: { i: Interview; onClose: () => void; onEdit: () => void; onPreview: () => void; onCandidate: () => void; onSend: () => void; onCancel: () => void }) {
  const c = i.application.candidate;
  const M = modeOf(i.mode);
  const end = new Date(+new Date(i.when) + (i.duration || 60) * 60000);
  const kv: [string, string | undefined][] = [
    ['Round', i.round],
    ['Interviewer', i.interviewer],
    ['Candidate email', c.email],
    [i.mode === 'Video' ? 'Meeting link' : 'Location', i.location],
  ];
  return (
    <Drawer
      onClose={onClose}
      header={
        <div className="who">
          <CandidatePhoto c={c} size={48} />
          <div>
            <b style={{ fontSize: 17 }}>{c.name}</b>
            <span>
              {i.application.job.title} · {i.application.job.client?.name}
            </span>
          </div>
        </div>
      }
    >
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', padding: 14, borderRadius: 12, background: 'var(--surface2)', border: '1px solid var(--line)' }}>
        <div style={{ width: 44, height: 44, borderRadius: 11, background: M.c + '1f', color: M.c, display: 'grid', placeItems: 'center' }}>
          <M.I size={21} />
        </div>
        <div>
          <b>{longDay(i.when)}</b>
          <div style={{ color: 'var(--text2)', fontSize: 13 }}>
            {fmtTime(i.when)} – {fmtTime(end)} · {i.duration || 60} min · {i.mode}
          </div>
        </div>
      </div>
      <div className="kv sec">
        {kv.map(([k, v]) =>
          v ? (
            <div key={k}>
              <span>{k}</span>
              <b style={{ wordBreak: 'break-word' }}>{v}</b>
            </div>
          ) : null,
        )}
      </div>
      {i.location && /^https?:/.test(i.location) && (
        <a className="btn sm" style={{ marginTop: 12 }} href={i.location} target="_blank" rel="noreferrer">
          <ExternalLink size={14} />
          Open meeting link
        </a>
      )}
      {i.notes && (
        <div className="sec">
          <h4>Note to candidate</h4>
          <div className="code">{i.notes}</div>
        </div>
      )}
      <div className="sec">
        <h4>Email invite</h4>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <InviteBadge s={i.inviteStatus} />
          {i.inviteSentAt && <span style={{ color: 'var(--muted)', fontSize: 12.5 }}>{shortDT(i.inviteSentAt)}</span>}
        </div>
        {i.inviteError && (
          <div className="banner bad" style={{ marginTop: 10 }}>
            {i.inviteError}
          </div>
        )}
        <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
          {i.inviteStatus && i.inviteStatus !== 'skipped' && (
            <button className="btn sm" onClick={onPreview}>
              <Eye size={14} />
              View email
            </button>
          )}
          {i.inviteStatus !== 'skipped' && (
            <button className="btn sm" onClick={onSend}>
              <Send size={14} />
              {i.inviteStatus ? 'Resend invite' : 'Send invite'}
            </button>
          )}
        </div>
      </div>
      <InterviewFeedback interview={i} />
      <div className="sec" style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button className="btn primary" onClick={onEdit}>
          <Pencil size={15} />
          Reschedule / edit
        </button>
        <button className="btn" onClick={onCandidate}>
          View candidate
        </button>
        <button className="btn danger" onClick={onCancel}>
          <XCircle size={15} />
          Cancel interview
        </button>
      </div>
    </Drawer>
  );
}
