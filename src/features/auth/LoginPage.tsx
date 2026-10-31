import { FileText, KanbanSquare, Loader2, Target, TrendingUp } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { errorMessage } from '@/api/errors';
import { LogoMark, Wordmark } from '@/components/Logo';
import { useSessionStore } from '@/stores/session.store';

export function LoginPage() {
  const login = useSessionStore((s) => s.login);
  const login2fa = useSessionStore((s) => s.login2fa);
  const nav = useNavigate();
  const from = (useLocation().state as { from?: string } | null)?.from;
  // PublicOnly redirects to the role's home once signed in, so after success we only need to leave /login.
  const done = () => nav(from && from !== '/login' ? from : '/', { replace: true });

  // dev convenience: prefill the seeded demo admin (never in production builds)
  const [email, setEmail] = useState(import.meta.env.DEV ? 'admin@talentforge.com' : '');
  const [password, setPassword] = useState(import.meta.env.DEV ? 'Admin@123' : '');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [ticket, setTicket] = useState<string | null>(null);
  const [code, setCode] = useState('');

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErr('');
    try {
      const challenge = await login(email, password);
      if (challenge) {
        setTicket(challenge.ticket);
        setCode('');
      } else done();
    } catch (x) {
      setErr(errorMessage(x));
    } finally {
      setBusy(false);
    }
  };
  const submit2 = async (e: FormEvent) => {
    e.preventDefault();
    if (!ticket) return;
    setBusy(true);
    setErr('');
    try {
      await login2fa(ticket, code);
      done();
    } catch (x) {
      const m = errorMessage(x);
      setErr(m);
      if (/expired|many/i.test(m)) setTicket(null);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="login">
      <div className="login-art">
        <div className="brand" style={{ padding: 0 }}>
          <LogoMark size={40} />
          <Wordmark />
        </div>
        <div>
          <h1>Place the right people, faster.</h1>
          <p>The all-in-one workspace for recruitment consultancies: sourcing, smart matching, pipelines and placements in one place.</p>
          <div className="feat">
            <div>
              <Target size={18} />
              AI-assisted candidate to job matching
            </div>
            <div>
              <FileText size={18} />
              Resume parsing from PDF and Word
            </div>
            <div>
              <KanbanSquare size={18} />
              Drag-and-drop hiring pipelines
            </div>
            <div>
              <TrendingUp size={18} />
              Revenue forecasting by stage
            </div>
          </div>
        </div>
        <small style={{ color: '#7f8ab0' }}>© Placewise</small>
      </div>
      <div className="login-form">
        {ticket ? (
          <form onSubmit={submit2}>
            <h2>Two-step verification</h2>
            <p style={{ color: 'var(--text2)', margin: '6px 0 18px' }}>
              Enter the 6-digit code from your authenticator app, or one of your recovery codes.
            </p>
            <label className="field">
              <span>Code</span>
              <input
                className="input"
                autoFocus
                autoComplete="one-time-code"
                inputMode="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="123 456"
                style={{ fontSize: 20, letterSpacing: '.12em', textAlign: 'center' }}
                required
              />
            </label>
            {err && (
              <div className="banner bad" role="alert">
                {err}
              </div>
            )}
            <button
              className="btn primary"
              style={{ width: '100%', justifyContent: 'center', marginTop: 20, padding: 11 }}
              disabled={busy || code.trim().length < 6}
            >
              {busy && <Loader2 size={16} className="spin" />}Verify
            </button>
            <button
              type="button"
              className="btn ghost"
              style={{ width: '100%', justifyContent: 'center', marginTop: 8 }}
              onClick={() => {
                setTicket(null);
                setErr('');
              }}
            >
              Back to sign in
            </button>
          </form>
        ) : (
          <form onSubmit={submit}>
            <h2>Welcome back</h2>
            <p style={{ color: 'var(--text2)', margin: '6px 0 18px' }}>Sign in to your workspace</p>
            <label className="field">
              <span>Email</span>
              <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoFocus required />
            </label>
            <label className="field">
              <span>Password</span>
              <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </label>
            {err && (
              <div className="banner bad" role="alert">
                {err}
              </div>
            )}
            <button className="btn primary" style={{ width: '100%', justifyContent: 'center', marginTop: 20, padding: 11 }} disabled={busy}>
              {busy && <Loader2 size={16} className="spin" />}Sign in
            </button>
            {import.meta.env.DEV && (
              <div className="banner" style={{ marginTop: 18, display: 'block', lineHeight: 1.7 }}>
                <b>Demo accounts (dev seed)</b>
                <br />
                Admin: admin@talentforge.com / Admin@123
                <br />
                HR: hr@talentforge.com / Recruit@123
              </div>
            )}
          </form>
        )}
      </div>
    </div>
  );
}
