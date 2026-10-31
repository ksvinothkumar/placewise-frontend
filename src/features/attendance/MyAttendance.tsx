import { CalendarCheck, CalendarPlus, ChevronLeft, ChevronRight, Clock, Plane, UserCheck, X as XIcon } from 'lucide-react';
import { useState } from 'react';
import { leaveApi, type LeaveRequest } from '@/api/endpoints/attendance';
import { errorMessage } from '@/api/errors';
import { useApiMutation } from '@/api/hooks';
import { Kpi } from '@/components/ui/Layout';
import { Skeleton } from '@/components/ui/Skeleton';
import { fmtDate } from '@/lib/format';
import { toast } from '@/stores/ui.store';
import { attKeys, useLeaveInfo, useLeaveRequests, useMonth } from './hooks';
import { LeaveModal } from './LeaveModal';
import { TodayCard } from './TodayCard';
import { CELL, LEAVE_TONE, dowOf, dur, hm, shiftMonth } from './utils';

const LEGEND: [keyof typeof CELL, string][] = [['present', 'Present'], ['leave', 'Leave'], ['holiday', 'Holiday'], ['off', 'Weekly off'], ['absent', 'Absent']];

export function MyAttendance() {
  const info = useLeaveInfo();
  const [month, setMonth] = useState<string | null>(null);
  const m = month ?? info.data?.today.slice(0, 7);
  const cal = useMonth(m);
  const reqs = useLeaveRequests();
  const [ask, setAsk] = useState(false);
  const cancel = useApiMutation((x: LeaveRequest) => leaveApi.cancel(x.id), {
    invalidate: [attKeys.all],
    onSuccess: () => toast('Leave cancelled'),
    onError: (e) => toast(errorMessage(e), 'error'),
  });
  const s = cal.data?.summary;
  const first = cal.data?.days[0];
  const lead = first ? (dowOf(first.date) + 6) % 7 : 0;

  return (
    <div style={{ display: 'grid', gap: 18 }}>
      <TodayCard />
      {s && (
        <div className="grid kpis">
          <Kpi icon={UserCheck} label="Days present" value={s.present} sub="this month" tone="good" />
          <Kpi icon={Clock} label="Hours worked" value={s.hours} sub={`${s.avgHours}h average`} />
          <Kpi icon={Plane} label="Leave taken" value={s.leaveDays} sub="days" tone="info" />
          <Kpi icon={XIcon} label="Absent" value={s.absent} sub="unexplained working days" tone="warn" />
        </div>
      )}
      <div className="grid cols-3" style={{ alignItems: 'start' }}>
        <div className="card">
          <div className="card-h">
            <CalendarCheck size={17} color="var(--brand)" />
            <h3>{m ? new Date(m + '-01T00:00:00').toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }) : ''}</h3>
            <span style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
              <button type="button" className="iconbtn" style={{ width: 30, height: 30 }} disabled={!m} onClick={() => m && setMonth(shiftMonth(m, -1))} aria-label="Previous month"><ChevronLeft size={15} /></button>
              <button type="button" className="iconbtn" style={{ width: 30, height: 30 }} disabled={!m} onClick={() => m && setMonth(shiftMonth(m, 1))} aria-label="Next month"><ChevronRight size={15} /></button>
            </span>
          </div>
          <div className="card-b">
            {!cal.data ? (
              <Skeleton rows={5} />
            ) : (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 6 }}>
                  {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => <div key={d} style={{ textAlign: 'center', fontSize: 11.5, color: 'var(--muted)', fontWeight: 600 }}>{d}</div>)}
                  {Array.from({ length: lead }, (_, i) => <div key={'p' + i} />)}
                  {cal.data.days.map((d) => {
                    const [bg, fg] = CELL[d.status];
                    const isToday = d.date === info.data?.today;
                    const label = d.status === 'present' ? (d.missedCheckout ? 'no check-out' : d.minutes != null ? dur(d.minutes) : 'in') : d.status === 'leave' ? 'Leave' : d.status === 'holiday' ? 'Holiday' : d.status === 'absent' ? 'Absent' : d.status === 'off' ? 'Off' : '';
                    return (
                      <div
                        key={d.date}
                        title={d.holiday || d.leaveType || (d.checkIn ? `${hm(d.checkIn)} to ${d.checkOut ? hm(d.checkOut) : '?'}` : '')}
                        aria-label={`${d.date}${label ? ': ' + label : ''}`}
                        style={{ background: bg, color: fg, borderRadius: 9, padding: '6px 4px', minHeight: 58, textAlign: 'center', border: isToday ? '2px solid var(--brand)' : '1px solid var(--line2)', fontSize: 12 }}
                      >
                        <div style={{ fontWeight: 700 }}>{+d.date.slice(8)}</div>
                        <div style={{ fontSize: 10.5, lineHeight: 1.2 }}>{label}</div>
                      </div>
                    );
                  })}
                </div>
                <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginTop: 14, fontSize: 12, color: 'var(--text2)' }}>
                  {LEGEND.map(([k, l]) => (
                    <span key={k} style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                      <i style={{ width: 11, height: 11, borderRadius: 3, background: CELL[k][0], border: `1px solid ${CELL[k][1]}` }} />{l}
                    </span>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
        <div style={{ display: 'grid', gap: 18 }}>
          <div className="card">
            <div className="card-h">
              <Plane size={17} color="var(--brand)" />
              <h3>Leave balance</h3>
              {info.data && <button type="button" className="btn sm primary" style={{ marginLeft: 'auto' }} onClick={() => setAsk(true)}><CalendarPlus size={13} />Request leave</button>}
            </div>
            <div className="card-b" style={{ display: 'grid', gap: 14 }}>
              {(info.data?.balances ?? []).map((b) => (
                <div key={b.key}>
                  <div style={{ display: 'flex', fontSize: 13.5 }}><b style={{ flex: 1 }}>{b.name}</b><span><b>{b.remaining}</b> / {b.total} left</span></div>
                  <div style={{ height: 8, borderRadius: 4, background: 'var(--line2)', marginTop: 5, display: 'flex', overflow: 'hidden' }}>
                    <div style={{ width: (b.used / (b.total || 1)) * 100 + '%', background: 'var(--brand)' }} />
                    <div style={{ width: (b.pending / (b.total || 1)) * 100 + '%', background: 'var(--warn)' }} />
                  </div>
                  <div style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 3 }}>{b.used} used{b.pending ? ` · ${b.pending} pending` : ''}</div>
                </div>
              ))}
            </div>
          </div>
          <div className="card">
            <div className="card-h"><h3>My leave requests</h3></div>
            <div className="card-b" style={{ paddingTop: 4 }}>
              {reqs.data?.length ? (
                reqs.data.slice(0, 8).map((x) => (
                  <div key={x.id} style={{ padding: '10px 0', borderBottom: '1px solid var(--line2)', fontSize: 13.5 }}>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <b style={{ flex: 1 }}>{x.typeName}</b>
                      <span className={'badge ' + (LEAVE_TONE[x.status] ?? '')} style={{ textTransform: 'capitalize' }}>{x.status}</span>
                    </div>
                    <div style={{ color: 'var(--text2)' }}>{fmtDate(x.from)}{x.from !== x.to && ` to ${fmtDate(x.to)}`} · {x.days} day{x.days === 1 ? '' : 's'}</div>
                    {x.decisionNote && <div style={{ color: 'var(--muted)', fontSize: 12.5 }}>"{x.decisionNote}" · {x.decidedByName}</div>}
                    {['pending', 'approved'].includes(x.status) && (
                      <button type="button" className="btn sm ghost" style={{ marginTop: 4 }} onClick={() => confirm('Cancel this leave request?') && cancel.mutate(x)}>Cancel request</button>
                    )}
                  </div>
                ))
              ) : (
                <div style={{ color: 'var(--muted)' }}>No leave requests yet.</div>
              )}
            </div>
          </div>
        </div>
      </div>
      {ask && info.data && <LeaveModal info={info.data} onClose={() => setAsk(false)} />}
    </div>
  );
}
