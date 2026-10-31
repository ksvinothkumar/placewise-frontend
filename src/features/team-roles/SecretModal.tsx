import { Copy, Mail } from 'lucide-react';
import type { EmailOutcome } from '@/api/endpoints/users';
import { Modal } from '@/components/ui/Modal';
import { toast } from '@/stores/ui.store';

export interface SecretInfo {
  title: string;
  sub: string;
  value: string;
  email?: EmailOutcome;
}

/** One-time temporary password. The value is never persisted anywhere. */
export function SecretModal({ title, sub, value, email, onClose }: SecretInfo & { onClose: () => void }) {
  const copy = () => {
    void navigator.clipboard?.writeText(value);
    toast('Password copied');
  };
  return (
    <Modal title={title} sub={sub} onClose={onClose} footer={<button type="button" className="btn primary" onClick={onClose}>Done</button>}>
      {email?.status === 'sent' && <div className="banner good" style={{ marginTop: 16 }}><Mail size={16} />Login details were emailed to <b>{email.to}</b>.</div>}
      {email?.status === 'simulated' && <div className="banner warn" style={{ marginTop: 16 }}><Mail size={16} />Email delivery is not configured, so nothing was sent. Share the password below with the user.</div>}
      {email?.status === 'failed' && <div className="banner bad" style={{ marginTop: 16 }}><Mail size={16} />The user was saved but the email failed ({email.error}). Share the password below with them.</div>}
      {!email && <div className="banner" style={{ marginTop: 16 }}><Mail size={16} />No email was sent. Share the password below with the user.</div>}
      <div className="banner warn" style={{ marginTop: 10 }}>This password is shown only once. The user will be asked to change it after signing in.</div>
      <div className="code" style={{ marginTop: 14, fontSize: 18, letterSpacing: '.04em', display: 'flex', alignItems: 'center', gap: 12 }}>
        <span style={{ flex: 1, userSelect: 'all' }} data-testid="temp-password">{value}</span>
        <button type="button" className="btn sm" onClick={copy}><Copy size={14} />Copy</button>
      </div>
    </Modal>
  );
}
