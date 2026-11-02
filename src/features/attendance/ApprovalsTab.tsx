import { Paginated } from '@/components/ui/Paginated';
import { Check, Loader2, X as XIcon } from 'lucide-react';
import { useState } from 'react';
import { leaveApi, type LeaveRequest } from '@/api/endpoints/attendance';
import { errorMessage } from '@/api/errors';
import { useApiMutation } from '@/api/hooks';
import { EmptyState } from '@/components/ui/EmptyState';
import { Field } from '@/components/ui/Layout';
import { Modal } from '@/components/ui/Modal';
import { Skeleton } from '@/components/ui/Skeleton';
import { fmtDate } from '@/lib/format';
import { useSessionStore } from '@/stores/session.store';
import { toast } from '@/stores/ui.store';
import { attKeys, useLeaveRequests } from './hooks';
import { LEAVE_TONE } from './utils';

const who = (u: LeaveRequest['user']) => (typeof u === 'object' ? u : undefined);
const uid = (u: LeaveRequest['user']) => (typeof u === 'object' ? u?.id : u);
const range = (x: LeaveRequest) => `${fmtDate(x.from)}${x.from !== x.to ? ` to ${fmtDate(x.to)}` : ''}`;

export function ApprovalsTab() {
  const { data } = useLeaveRequests('team');
  const me = useSessionStore((s) => s.user);
  const [dec, setDec] = useState<{ x: LeaveRequest; decision: 'approved' | 'rejected' } | null>(null);
  const [note, setNote] = useState('');

  const go = useApiMutation((v: NonNullable<typeof dec>) => leaveApi.decide(v.x.id, v.decision, note), {
    invalidate: [attKeys.all],
    onSuccess: (_r, v) => {
      toast(`Leave ${v.decision}`);
      setDec(null);
      setNote('');
    },
    onError: (e) => toast(errorMessage(e), 'error'),
  });
  const open = (x: LeaveRequest, decision: 'approved' | 'rejected') => {
    setDec({ x, decision });
    setNote('');
  };
  const pending = (data ?? []).filter((x) => x.status === 'pending');
  const done = (data ?? []).filter((x) => x.status !== 'pending').slice(0, 15);

  return (
    <div className="grid" style={{ gap: 18 }}>
      <div className="card">
        <div className="card-h"><h3>Waiting for a decision</h3><small>{pending.length}</small></div>
        {!data ? (
          <Skeleton rows={3} />
        ) : pending.length ? (
          <Paginated items={pending} render={(pageRows) => (
          <table className="table" style={{ marginTop: 10 }}>
            <tbody>
              {pageRows.map((x) => (
                <tr key={x.id}>
                  <td><b>{who(x.user)?.name}</b><div style={{ fontSize: 12.5, color: 'var(--muted)' }}>{x.typeName}</div></td>
                  <td>{range(x)}<div style={{ fontSize: 12.5, color: 'var(--muted)' }}>{x.days} day{x.days === 1 ? '' : 's'}</div></td>
                  <td style={{ color: 'var(--text2)', maxWidth: 260 }}>{x.reason || '—'}</td>
                  <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                    {uid(x.user) === me?.id ? (
                      <span style={{ color: 'var(--muted)', fontSize: 12.5 }}>Needs another manager</span>
                    ) : (
                      <>
                        <button type="button" className="btn sm primary" onClick={() => open(x, 'approved')} aria-label={`Approve leave for ${who(x.user)?.name}`}><Check size={13} />Approve</button>{' '}
                        <button type="button" className="btn sm" onClick={() => open(x, 'rejected')} aria-label={`Reject leave for ${who(x.user)?.name}`}><XIcon size={13} />Reject</button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          )} />
        ) : (
          <EmptyState title="Nothing waiting" sub="New leave requests will appear here." />
        )}
      </div>
      {done.length > 0 && (
        <div className="card">
          <div className="card-h"><h3>Recent decisions</h3></div>
          <Paginated items={done} render={(pageRows) => (
          <table className="table" style={{ marginTop: 10 }}>
            <tbody>
              {pageRows.map((x) => (
                <tr key={x.id}>
                  <td><b>{who(x.user)?.name}</b></td>
                  <td>{x.typeName}</td>
                  <td>{range(x)}</td>
                  <td><span className={'badge ' + (LEAVE_TONE[x.status] ?? '')} style={{ textTransform: 'capitalize' }}>{x.status}</span></td>
                  <td style={{ color: 'var(--muted)' }}>{x.decidedByName}</td>
                </tr>
              ))}
            </tbody>
          </table>
          )} />
        </div>
      )}
      {dec && (
        <Modal
          title={`${dec.decision === 'approved' ? 'Approve' : 'Reject'} leave`}
          sub={`${who(dec.x.user)?.name} · ${dec.x.typeName} · ${dec.x.days} day(s)`}
          onClose={() => setDec(null)}
          footer={
            <>
              <button type="button" className="btn" onClick={() => setDec(null)}>Cancel</button>
              <button type="button" className={'btn ' + (dec.decision === 'approved' ? 'primary' : 'danger')} disabled={go.isPending} onClick={() => go.mutate(dec)}>
                {go.isPending && <Loader2 size={15} className="spin" />}{dec.decision === 'approved' ? 'Approve' : 'Reject'}
              </button>
            </>
          }
        >
          <Field label="Note to the employee (optional)"><textarea className="textarea" style={{ minHeight: 70 }} value={note} onChange={(e) => setNote(e.target.value)} /></Field>
        </Modal>
      )}
    </div>
  );
}
