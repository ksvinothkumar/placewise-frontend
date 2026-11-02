import { Paginated } from '@/components/ui/Paginated';
import { useQuery } from '@tanstack/react-query';
import { Loader2, Pencil } from 'lucide-react';
import { useState } from 'react';
import { attendanceApi, type TeamStatus } from '@/api/endpoints/attendance';
import { errorMessage } from '@/api/errors';
import { useApiMutation } from '@/api/hooks';
import { Field } from '@/components/ui/Layout';
import { Modal } from '@/components/ui/Modal';
import { Skeleton } from '@/components/ui/Skeleton';
import { fromLocalInput, toLocalInput } from '@/lib/dates';
import { fmtDate, roleLabel } from '@/lib/format';
import { toast } from '@/stores/ui.store';
import { attKeys, useLeaveInfo } from './hooks';
import { dur, hm } from './utils';

const TONE: Record<TeamStatus, [string, string]> = {
  in: ['good', 'In'], out: ['brand', 'Checked out'], leave: ['info', 'On leave'], absent: ['bad', 'Not in'], holiday: ['', 'Holiday'], off: ['', 'Weekly off'], future: ['', '—'],
};
const COUNTS = [['in', 'In now'], ['out', 'Checked out'], ['leave', 'On leave'], ['absent', 'Not in']] as const;

export function TeamTab() {
  const info = useLeaveInfo();
  const [date, setDate] = useState<string | null>(null);
  const d = date ?? info.data?.today;
  const { data } = useQuery({ queryKey: attKeys.team(d ?? ''), queryFn: () => attendanceApi.team(d!), enabled: !!d });
  const [fix, setFix] = useState<{ id: string; name: string; checkIn: string; checkOut: string } | null>(null);

  const save = useApiMutation(
    (f: NonNullable<typeof fix>) => attendanceApi.correct(f.id, d!, { checkIn: fromLocalInput(f.checkIn), checkOut: f.checkOut ? fromLocalInput(f.checkOut) : undefined }),
    {
      invalidate: [attKeys.all],
      onSuccess: () => {
        toast('Attendance corrected');
        setFix(null);
      },
      onError: (e) => toast(errorMessage(e), 'error'),
    },
  );

  return (
    <div className="card">
      <div className="toolbar">
        <input className="input" type="date" style={{ width: 170 }} aria-label="Date" value={d ?? ''} onChange={(e) => setDate(e.target.value)} />
        {data && COUNTS.map(([k, l]) => <span key={k} className={'badge ' + TONE[k][0]}>{data.counts[k]} {l}</span>)}
      </div>
      {!data ? (
        <Skeleton />
      ) : (
        <Paginated items={data.rows} render={(pageRows) => (
        <table className="table">
          <thead><tr><th>Person</th><th>Status</th><th>In</th><th>Out</th><th>Worked</th><th /></tr></thead>
          <tbody>
            {pageRows.map((r) => (
              <tr key={r.id}>
                <td><b>{r.name}</b><div style={{ fontSize: 12.5, color: 'var(--muted)' }}>{roleLabel(r.role)}{r.branch ? ' · ' + r.branch : ''}</div></td>
                <td>
                  <span className={'badge ' + TONE[r.status][0]}>
                    {TONE[r.status][1]}
                    {r.status === 'leave' ? `: ${r.leaveType}` : r.status === 'holiday' ? `: ${r.holiday}` : ''}
                  </span>
                </td>
                <td>{r.checkIn ? hm(r.checkIn) : '—'}</td>
                <td>{r.checkOut ? hm(r.checkOut) : '—'}</td>
                <td>{dur(r.minutes)}</td>
                <td style={{ textAlign: 'right' }}>
                  <button
                    type="button"
                    className="btn sm ghost"
                    aria-label={`Correct attendance for ${r.name}`}
                    onClick={() => setFix({ id: r.id, name: r.name, checkIn: toLocalInput(r.checkIn ?? new Date(d + 'T09:30:00')), checkOut: r.checkOut ? toLocalInput(r.checkOut) : '' })}
                  >
                    <Pencil size={13} />Correct
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        )} />
      )}
      {fix && (
        <Modal
          title={`Correct attendance: ${fix.name}`}
          sub={fmtDate(d)}
          onClose={() => setFix(null)}
          footer={
            <>
              <button type="button" className="btn" onClick={() => setFix(null)}>Cancel</button>
              <button type="button" className="btn primary" disabled={save.isPending || !fix.checkIn} onClick={() => save.mutate(fix)}>
                {save.isPending && <Loader2 size={15} className="spin" />}Save
              </button>
            </>
          }
        >
          <div className="f2">
            <Field label="Check in"><input className="input" type="datetime-local" value={fix.checkIn} onChange={(e) => setFix({ ...fix, checkIn: e.target.value })} /></Field>
            <Field label="Check out"><input className="input" type="datetime-local" value={fix.checkOut} onChange={(e) => setFix({ ...fix, checkOut: e.target.value })} /></Field>
          </div>
        </Modal>
      )}
    </div>
  );
}
