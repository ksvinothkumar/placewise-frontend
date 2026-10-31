import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Copy, Download, KeyRound, Loader2, ShieldCheck, ShieldOff } from 'lucide-react';
import { useState } from 'react';
import { authApi } from '@/api/endpoints/auth';
import { errorMessage } from '@/api/errors';
import { Field, Modal } from '@/components/ui';
import { toast } from '@/stores/ui.store';

const KEY = ['auth', '2fa-status'] as const;

export function TwoFactorCard() {
  const qc = useQueryClient();
  // endpoint may not exist yet on the new backend: no retry, card just shows "Off"
  const { data: st } = useQuery({ queryKey: KEY, queryFn: authApi.twoFactor.status, retry: false });
  const [step, setStep] = useState<'scan' | 'off' | null>(null);
  const [setup, setSetup] = useState<{ qr: string; secret: string } | null>(null);
  const [code, setCode] = useState('');
  const [codes, setCodes] = useState<string[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [pw, setPw] = useState('');

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    try {
      await fn();
    } catch (e) {
      toast(errorMessage(e), 'error');
    } finally {
      setBusy(false);
    }
  };
  const start = () =>
    run(async () => {
      setSetup(await authApi.twoFactor.setup());
      setStep('scan');
      setCode('');
    });
  const enable = () =>
    run(async () => {
      const r = await authApi.twoFactor.enable(code);
      setCodes(r.recoveryCodes);
      setStep(null);
      await qc.invalidateQueries({ queryKey: KEY });
      toast('Two-step verification is on');
    });
  const disable = () =>
    run(async () => {
      await authApi.twoFactor.disable(pw, code);
      setStep(null);
      setPw('');
      setCode('');
      await qc.invalidateQueries({ queryKey: KEY });
      toast('Two-step verification is off');
    });
  const save = () => {
    const url = URL.createObjectURL(
      new Blob([`Placewise recovery codes\nEach code works once.\n\n${(codes ?? []).join('\n')}\n`], { type: 'text/plain' }),
    );
    Object.assign(document.createElement('a'), { href: url, download: 'placewise-recovery-codes.txt' }).click();
    URL.revokeObjectURL(url);
  };
  const six = code.replace(/\s/g, '').length === 6;

  return (
    <>
      <div className="card">
        <div className="card-h">
          {st?.enabled ? <ShieldCheck size={17} color="var(--good)" /> : <ShieldOff size={17} color="var(--muted)" />}
          <h3>Two-step verification</h3>
          <span className={'badge ' + (st?.enabled ? 'good' : '')} style={{ marginLeft: 'auto' }}>
            {st?.enabled ? 'On' : 'Off'}
          </span>
        </div>
        <div className="card-b">
          <p style={{ color: 'var(--text2)', margin: '0 0 14px' }}>
            Protect your account with a 6-digit code from an authenticator app (Google Authenticator, Authy, 1Password, Microsoft
            Authenticator) in addition to your password.
          </p>
          {st?.enabled ? (
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
              <span style={{ color: 'var(--text2)', fontSize: 13 }}>
                <KeyRound size={13} style={{ verticalAlign: -2 }} /> {st.recoveryLeft ?? 0} recovery code{st.recoveryLeft === 1 ? '' : 's'}{' '}
                left
              </span>
              <span style={{ flex: 1 }} />
              <button
                className="btn danger"
                onClick={() => {
                  setStep('off');
                  setCode('');
                  setPw('');
                }}
              >
                Turn off
              </button>
            </div>
          ) : (
            <button className="btn primary" onClick={start} disabled={busy}>
              {busy && <Loader2 size={15} className="spin" />}Set up two-step verification
            </button>
          )}
        </div>
      </div>

      {step === 'scan' && setup && (
        <Modal
          title="Scan with your authenticator app"
          sub="Step 1 of 2"
          onClose={() => setStep(null)}
          footer={
            <>
              <button className="btn" onClick={() => setStep(null)}>
                Cancel
              </button>
              <button className="btn primary" disabled={busy || !six} onClick={enable}>
                {busy && <Loader2 size={15} className="spin" />}Turn on
              </button>
            </>
          }
        >
          <div style={{ display: 'flex', gap: 20, marginTop: 14, flexWrap: 'wrap', alignItems: 'center' }}>
            <img
              src={setup.qr}
              alt="QR code"
              width="180"
              height="180"
              style={{ borderRadius: 10, border: '1px solid var(--line)', background: '#fff', padding: 6 }}
            />
            <div style={{ flex: 1, minWidth: 200 }}>
              <p style={{ margin: '0 0 8px', color: 'var(--text2)', fontSize: 13.5 }}>Can&apos;t scan? Enter this key manually:</p>
              <div className="code" style={{ userSelect: 'all', fontSize: 13 }}>
                {setup.secret}
              </div>
            </div>
          </div>
          <Field label="Step 2: enter the 6-digit code it shows">
            <input
              className="input"
              autoFocus
              inputMode="numeric"
              maxLength={7}
              placeholder="123 456"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              style={{ fontSize: 20, letterSpacing: '.15em', textAlign: 'center' }}
            />
          </Field>
        </Modal>
      )}

      {codes && (
        <Modal
          title="Save your recovery codes"
          sub="If you lose your phone, each code lets you sign in once"
          onClose={() => setCodes(null)}
          footer={
            <>
              <button
                className="btn"
                onClick={() => {
                  void navigator.clipboard.writeText(codes.join('\n'));
                  toast('Copied');
                }}
              >
                <Copy size={15} />
                Copy
              </button>
              <button className="btn" onClick={save}>
                <Download size={15} />
                Download
              </button>
              <button className="btn primary" onClick={() => setCodes(null)}>
                I&apos;ve saved them
              </button>
            </>
          }
        >
          <div className="banner warn" style={{ marginTop: 14 }}>
            These are shown only once. Store them somewhere safe, such as a password manager.
          </div>
          <div
            className="code"
            style={{ marginTop: 14, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 15, letterSpacing: '.04em' }}
          >
            {codes.map((c) => (
              <span key={c}>{c}</span>
            ))}
          </div>
        </Modal>
      )}

      {step === 'off' && (
        <Modal
          title="Turn off two-step verification?"
          sub="Your account will rely on your password alone"
          onClose={() => setStep(null)}
          footer={
            <>
              <button className="btn" onClick={() => setStep(null)}>
                Cancel
              </button>
              <button className="btn danger" disabled={busy || !pw || !six} onClick={disable}>
                {busy && <Loader2 size={15} className="spin" />}Turn off
              </button>
            </>
          }
        >
          <Field label="Your password">
            <input className="input" type="password" autoFocus value={pw} onChange={(e) => setPw(e.target.value)} />
          </Field>
          <Field label="Current 6-digit code">
            <input className="input" inputMode="numeric" maxLength={7} value={code} onChange={(e) => setCode(e.target.value)} />
          </Field>
        </Modal>
      )}
    </>
  );
}
