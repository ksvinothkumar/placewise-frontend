import { Loader2, Plus, Save, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { settingsApi, type Holiday, type LeavePolicy } from '@/api/endpoints/settings';
import { errorMessage } from '@/api/errors';
import { useApiMutation } from '@/api/hooks';
import { queryKeys } from '@/api/queryKeys';
import { Skeleton } from '@/components/ui/Skeleton';
import { toast } from '@/stores/ui.store';
import { settingsKeys, useSettingsView } from './hooks';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const hidden = { position: 'absolute', opacity: 0, width: 1, height: 1, pointerEvents: 'none' } as const;

export function LeaveTab() {
  const { data } = useSettingsView();
  const [draft, setDraft] = useState<LeavePolicy | null>(null);
  const [h, setH] = useState<Holiday>({ date: '', name: '' });
  const f: LeavePolicy | null = draft ?? (data?.leaveTypes ? { leaveTypes: data.leaveTypes, holidays: data.holidays ?? [], weeklyOff: data.weeklyOff ?? [0, 6] } : null);

  const save = useApiMutation((p: LeavePolicy) => settingsApi.saveLeave(p), {
    invalidate: [settingsKeys.view, queryKeys.attendance.all, ['api']],
    onSuccess: () => {
      toast('Leave policy saved');
      setDraft(null);
    },
    onError: (e) => toast(errorMessage(e), 'error'),
  });

  if (!f) return <div className="card"><Skeleton rows={5} /></div>;
  const patch = (p: Partial<LeavePolicy>) => setDraft({ ...f, ...p });
  const setType = (i: number, p: Partial<LeavePolicy['leaveTypes'][number]>) => patch({ leaveTypes: f.leaveTypes.map((x, j) => (j === i ? { ...x, ...p } : x)) });
  const addHoliday = () => {
    patch({ holidays: [...f.holidays.filter((x) => x.date !== h.date), { date: h.date, name: h.name.trim() }].sort((a, b) => a.date.localeCompare(b.date)) });
    setH({ date: '', name: '' });
  };

  return (
    <div className="grid cols-2" style={{ alignItems: 'start' }}>
      <div className="card">
        <div className="card-h">
          <h3>Leave types</h3>
          <small>days per year, per person</small>
          <button type="button" className="btn sm" style={{ marginLeft: 'auto' }} onClick={() => patch({ leaveTypes: [...f.leaveTypes, { key: '', name: '', days: 5 }] })}><Plus size={13} />Add</button>
        </div>
        <div className="card-b" style={{ display: 'grid', gap: 8 }}>
          {f.leaveTypes.map((t, i) => (
            <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 90px 34px', gap: 8 }}>
              <input className="input" placeholder="e.g. Casual leave" aria-label={`Leave type ${i + 1} name`} value={t.name} onChange={(e) => setType(i, { name: e.target.value })} />
              <input className="input" type="number" min="0" aria-label={`Leave type ${i + 1} days per year`} value={t.days} onChange={(e) => setType(i, { days: e.target.value })} />
              <button type="button" className="iconbtn" aria-label={`Remove leave type ${t.name || i + 1}`} onClick={() => patch({ leaveTypes: f.leaveTypes.filter((_, j) => j !== i) })}><Trash2 size={14} /></button>
            </div>
          ))}
          <div style={{ fontWeight: 600, marginTop: 10 }}>Weekly off days</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {DAYS.map((d, i) => {
              const on = f.weeklyOff.includes(i);
              return (
                <label key={d} className="badge" style={{ cursor: 'pointer', position: 'relative', ...(on ? { background: 'var(--brand-soft)', color: 'var(--brand-text)' } : {}) }}>
                  <input type="checkbox" style={hidden} checked={on} onChange={() => patch({ weeklyOff: on ? f.weeklyOff.filter((x) => x !== i) : [...f.weeklyOff, i] })} />
                  {d}
                </label>
              );
            })}
          </div>
        </div>
      </div>
      <div className="card">
        <div className="card-h"><h3>Holidays</h3><small>not counted as leave</small></div>
        <div className="card-b">
          <div style={{ display: 'flex', gap: 8 }}>
            <input className="input" type="date" style={{ width: 160 }} aria-label="Holiday date" value={h.date} onChange={(e) => setH({ ...h, date: e.target.value })} />
            <input className="input" placeholder="e.g. Diwali" aria-label="Holiday name" value={h.name} onChange={(e) => setH({ ...h, name: e.target.value })} />
            <button type="button" className="btn" disabled={!h.date || !h.name.trim()} onClick={addHoliday}>Add</button>
          </div>
          <div style={{ marginTop: 12, maxHeight: 280, overflow: 'auto' }}>
            {f.holidays.length ? (
              f.holidays.map((x) => (
                <div key={x.date} style={{ display: 'flex', gap: 10, alignItems: 'center', padding: '7px 0', borderBottom: '1px solid var(--line2)' }}>
                  <b style={{ width: 110 }}>{new Date(x.date + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</b>
                  <span style={{ flex: 1 }}>{x.name}</span>
                  <button type="button" className="iconbtn" style={{ width: 28, height: 28 }} aria-label={`Remove ${x.name}`} onClick={() => patch({ holidays: f.holidays.filter((y) => y.date !== x.date) })}><Trash2 size={13} /></button>
                </div>
              ))
            ) : (
              <div style={{ color: 'var(--muted)' }}>No holidays added yet.</div>
            )}
          </div>
        </div>
      </div>
      <div style={{ gridColumn: '1/-1', textAlign: 'right' }}>
        <button type="button" className="btn primary" disabled={save.isPending} onClick={() => save.mutate({ ...f, leaveTypes: f.leaveTypes.map((t) => ({ ...t, days: Number(t.days) || 0 })) })}>
          {save.isPending ? <Loader2 size={15} className="spin" /> : <Save size={15} />}Save leave policy
        </button>
      </div>
    </div>
  );
}
