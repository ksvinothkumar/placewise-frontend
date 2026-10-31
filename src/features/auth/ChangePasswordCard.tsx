import { CheckCircle2, Circle, Eye, EyeOff, KeyRound, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { authApi } from '@/api/endpoints/auth';
import { errorMessage } from '@/api/errors';
import { Field } from '@/components/ui/Layout';
import { useSessionStore } from '@/stores/session.store';
import { toast } from '@/stores/ui.store';

const rules = (p: string): [string, boolean][] => [
  ['At least 8 characters', p.length >= 8],
  ['Contains a letter', /[A-Za-z]/.test(p)],
  ['Contains a number', /\d/.test(p)],
  ['Contains an uppercase letter and a symbol (stronger)', /[A-Z]/.test(p) && /[^A-Za-z0-9]/.test(p)],
];

export function ChangePasswordCard() {
  const refreshMe = useSessionStore((s) => s.refreshMe);
  const [pw, setPw] = useState({ cur: '', next: '', again: '' });
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const R = rules(pw.next);
  const strength = R.filter(([, ok]) => ok).length;
  const mismatch = pw.again && pw.next !== pw.again;
  const canSubmit = pw.cur && R.slice(0, 3).every(([, ok]) => ok) && pw.next === pw.again && !busy;

  const submit = async () => {
    setBusy(true);
    setErr('');
    try {
      await authApi.changePassword(pw.cur, pw.next);
      setPw({ cur: '', next: '', again: '' });
      toast('Password changed');
      await refreshMe(); // clears mustChangePassword
    } catch (e) {
      setErr(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };
  const input = (k: keyof typeof pw, label: string, auto: string) => (
    <Field label={label}>
      <div style={{ position: 'relative' }}>
        <input
          className="input"
          type={show ? 'text' : 'password'}
          autoComplete={auto}
          value={pw[k]}
          onChange={(e) => setPw((s) => ({ ...s, [k]: e.target.value }))}
          style={{ paddingRight: 40 }}
        />
      </div>
    </Field>
  );
  return (
    <div className="card">
      <div className="card-h">
        <KeyRound size={17} color="var(--brand)" />
        <h3>Change password</h3>
        <button className="btn sm ghost" style={{ marginLeft: 'auto' }} onClick={() => setShow((s) => !s)}>
          {show ? <EyeOff size={14} /> : <Eye size={14} />}
          {show ? 'Hide' : 'Show'}
        </button>
      </div>
      <div className="card-b">
        {input('cur', 'Current password', 'current-password')}
        {input('next', 'New password', 'new-password')}
        {pw.next && (
          <div style={{ marginTop: 10 }}>
            <div style={{ display: 'flex', gap: 4 }}>
              {[1, 2, 3, 4].map((n) => (
                <i
                  key={n}
                  style={{
                    flex: 1,
                    height: 5,
                    borderRadius: 3,
                    background:
                      n <= strength ? (strength <= 2 ? 'var(--bad)' : strength === 3 ? 'var(--warn)' : 'var(--good)') : 'var(--line)',
                  }}
                />
              ))}
            </div>
            <ul style={{ listStyle: 'none', margin: '10px 0 0', padding: 0, display: 'grid', gap: 4, fontSize: 12.5 }}>
              {R.map(([t, ok]) => (
                <li key={t} style={{ display: 'flex', gap: 7, alignItems: 'center', color: ok ? 'var(--good)' : 'var(--muted)' }}>
                  {ok ? <CheckCircle2 size={14} /> : <Circle size={14} />}
                  {t}
                </li>
              ))}
            </ul>
          </div>
        )}
        {input('again', 'Confirm new password', 'new-password')}
        {mismatch && <div style={{ color: 'var(--bad)', fontSize: 12.5, marginTop: 6 }}>Passwords do not match</div>}
        {err && (
          <div className="banner bad" role="alert">
            {err}
          </div>
        )}
        <button className="btn primary" style={{ marginTop: 20 }} disabled={!canSubmit} onClick={submit}>
          {busy ? <Loader2 size={15} className="spin" /> : <KeyRound size={15} />}Update password
        </button>
      </div>
    </div>
  );
}
