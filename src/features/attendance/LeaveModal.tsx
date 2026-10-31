import { Loader2 } from 'lucide-react';
import { useState } from 'react';
import { leaveApi, type LeaveInfo } from '@/api/endpoints/attendance';
import { errorMessage } from '@/api/errors';
import { useApiMutation } from '@/api/hooks';
import { Field } from '@/components/ui/Layout';
import { Modal } from '@/components/ui/Modal';
import { toast } from '@/stores/ui.store';
import { attKeys } from './hooks';
import { leaveDays } from './utils';

export function LeaveModal({ info, onClose }: { info: LeaveInfo; onClose: () => void }) {
  const [v, setV] = useState({ type: info.leaveTypes[0]?.key ?? '', from: info.today, to: info.today, halfDay: false, reason: '' });
  const days = leaveDays(v.from, v.to, info.weeklyOff, info.holidays.map((h) => h.date), v.halfDay);
  const bal = info.balances.find((b) => b.key === v.type);
  const over = !!bal && days > bal.remaining;

  const save = useApiMutation(() => leaveApi.request(v), {
    invalidate: [attKeys.all],
    onSuccess: () => {
      toast('Leave requested. Your manager has been notified.');
      onClose();
    },
    onError: (e) => toast(errorMessage(e), 'error'),
  });

  return (
    <Modal
      title="Request leave"
      sub="Weekly offs and holidays are not counted"
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn" onClick={onClose}>Cancel</button>
          <button type="button" className="btn primary" disabled={save.isPending || !days || over} onClick={() => save.mutate()}>
            {save.isPending && <Loader2 size={15} className="spin" />}Send request
          </button>
        </>
      }
    >
      <Field label="Leave type">
        <select className="select" value={v.type} onChange={(e) => setV({ ...v, type: e.target.value })}>
          {info.leaveTypes.map((t) => <option key={t.key} value={t.key}>{t.name}</option>)}
        </select>
      </Field>
      <div className="f2">
        <Field label="From"><input className="input" type="date" value={v.from} onChange={(e) => setV({ ...v, from: e.target.value, to: e.target.value > v.to ? e.target.value : v.to })} /></Field>
        <Field label="To"><input className="input" type="date" min={v.from} value={v.to} onChange={(e) => setV({ ...v, to: e.target.value })} /></Field>
      </div>
      {v.from === v.to && (
        <label style={{ display: 'flex', gap: 8, marginTop: 12, alignItems: 'center' }}>
          <input type="checkbox" checked={v.halfDay} onChange={(e) => setV({ ...v, halfDay: e.target.checked })} />Half day
        </label>
      )}
      <Field label="Reason (optional)"><textarea className="textarea" style={{ minHeight: 64 }} value={v.reason} onChange={(e) => setV({ ...v, reason: e.target.value })} /></Field>
      <div className={'banner ' + (over || !days ? 'bad' : 'good')} style={{ marginTop: 14 }} role="status">
        {!days ? (
          'These dates are all weekly offs or holidays. No leave needed.'
        ) : (
          <>
            <b>{days} working day{days === 1 ? '' : 's'}</b> · {bal ? `${bal.remaining} of ${bal.total} ${bal.name.toLowerCase()} left` : ''}
            {over ? '. That is more than your balance.' : ''}
          </>
        )}
      </div>
    </Modal>
  );
}
