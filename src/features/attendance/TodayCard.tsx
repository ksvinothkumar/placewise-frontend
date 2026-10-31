import { Check, Loader2, LogIn, LogOut } from 'lucide-react';
import { useEffect, useState } from 'react';
import { attendanceApi } from '@/api/endpoints/attendance';
import { errorMessage } from '@/api/errors';
import { useApiMutation } from '@/api/hooks';
import { Skeleton } from '@/components/ui/Skeleton';
import { toast } from '@/stores/ui.store';
import { attKeys, useToday } from './hooks';
import { clock, dur, hm } from './utils';

export function TodayCard() {
  const { data: t } = useToday();
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const i = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(i);
  }, []);

  const act = useApiMutation((kind: 'check-in' | 'check-out') => (kind === 'check-in' ? attendanceApi.checkIn() : attendanceApi.checkOut()), {
    invalidate: [attKeys.all],
    onSuccess: (_r, kind) => toast(kind === 'check-in' ? 'Checked in. Have a great day!' : 'Checked out. See you tomorrow!'),
    onError: (e) => toast(errorMessage(e), 'error'),
  });

  if (!t) return <div className="card"><Skeleton rows={3} /></div>;
  const rec = t.record;
  const inn = !!rec && !rec.checkOut;
  const elapsed = inn ? Math.max(0, Math.floor((now - new Date(rec.checkIn).getTime()) / 1000)) : 0;
  const note = t.leave
    ? `You're on approved ${t.leave.typeName} today.`
    : t.day?.kind === 'holiday'
      ? `Holiday: ${t.day.name}`
      : t.day?.kind === 'off' && !rec
        ? 'Weekly off. You can still check in if you are working.'
        : '';
  const busy = act.isPending;

  return (
    <div className="card" style={{ background: 'linear-gradient(135deg,var(--brand-soft),var(--surface))' }}>
      <div className="card-b" style={{ display: 'flex', gap: 24, alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 220 }}>
          <div style={{ color: 'var(--text2)', fontSize: 13 }}>{new Date(now).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}</div>
          <div style={{ fontSize: 34, fontWeight: 700, letterSpacing: '-.02em', fontVariantNumeric: 'tabular-nums' }}>
            {new Date(now).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </div>
          <div style={{ color: 'var(--text2)', marginTop: 2 }} aria-live="polite">
            {!rec ? (
              'You have not checked in yet.'
            ) : inn ? (
              <>Checked in at <b>{hm(rec.checkIn)}</b> · working for <b style={{ fontVariantNumeric: 'tabular-nums' }}>{clock(elapsed)}</b></>
            ) : (
              <>In <b>{hm(rec.checkIn)}</b> · out <b>{hm(rec.checkOut!)}</b> · <b>{dur(rec.workMinutes)}</b> worked</>
            )}
          </div>
          {note && <div className="banner" style={{ marginTop: 10 }}>{note}</div>}
        </div>
        {!rec ? (
          <button type="button" className="btn primary" style={{ padding: '14px 26px', fontSize: 16 }} disabled={busy || !!t.leave} onClick={() => act.mutate('check-in')}>
            {busy ? <Loader2 size={18} className="spin" /> : <LogIn size={18} />}Check in
          </button>
        ) : inn ? (
          <button type="button" className="btn" style={{ padding: '14px 26px', fontSize: 16, borderColor: 'var(--bad)', color: 'var(--bad)' }} disabled={busy} onClick={() => act.mutate('check-out')}>
            {busy ? <Loader2 size={18} className="spin" /> : <LogOut size={18} />}Check out
          </button>
        ) : (
          <span className="badge good" style={{ padding: '8px 16px', fontSize: 14 }}><Check size={14} />Done for today</span>
        )}
      </div>
    </div>
  );
}
