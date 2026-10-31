import { BadgeCheck, CalendarDays, Camera, KeyRound, Loader2, Mail, Phone, Save, Shield } from 'lucide-react';
import { useState } from 'react';
import { authApi } from '@/api/endpoints/auth';
import { errorMessage } from '@/api/errors';
import { PhotoEditor } from '@/components/PhotoEditor';
import { CandidatePhoto } from '@/components/ui/Avatar';
import { Field, PageHead } from '@/components/ui/Layout';
import { fmtLongDate, roleLabel } from '@/lib/format';
import { useSessionStore } from '@/stores/session.store';
import { toast } from '@/stores/ui.store';
import { ChangePasswordCard } from './ChangePasswordCard';
import { TwoFactorCard } from './TwoFactorCard';

export function ProfilePage() {
  const user = useSessionStore((s) => s.user);
  const setUser = useSessionStore((s) => s.setUser);
  const refreshMe = useSessionStore((s) => s.refreshMe);
  const [f, setF] = useState({ name: user?.name || '', title: user?.title || '', phone: user?.phone || '' });
  const [saving, setSaving] = useState(false);
  const [photo, setPhoto] = useState(false);
  if (!user) return null;
  const dirty = f.name !== (user.name || '') || f.title !== (user.title || '') || f.phone !== (user.phone || '');

  const saveProfile = async () => {
    setSaving(true);
    try {
      setUser(await authApi.updateProfile(f));
      toast('Profile updated');
    } catch (e) {
      toast(errorMessage(e), 'error');
    } finally {
      setSaving(false);
    }
  };
  const row = { display: 'inline-flex', gap: 7, alignItems: 'center' } as const;

  return (
    <>
      <PageHead title="My profile" sub="Manage your account details and security" />
      {user.mustChangePassword && (
        <div className="banner warn" style={{ marginBottom: 18 }}>
          <KeyRound size={17} />
          <span>
            <b>Set a new password to continue.</b> You are using a temporary password. Enter it as the current password below and choose
            your own.
          </span>
        </div>
      )}
      <div className="card">
        <div className="card-b" style={{ display: 'flex', gap: 28, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative' }}>
            <CandidatePhoto c={user} size={120} passport path="/auth/photo" />
            <button
              className="iconbtn"
              style={{ position: 'absolute', right: -10, bottom: -10, width: 36, height: 36, borderRadius: '50%', boxShadow: 'var(--sh2)' }}
              onClick={() => setPhoto(true)}
              title="Change photo"
              aria-label="Change photo"
            >
              <Camera size={16} />
            </button>
          </div>
          <div style={{ flex: 1, minWidth: 260 }}>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
              <h1 style={{ fontSize: 24, letterSpacing: '-.02em' }}>{user.name}</h1>
              <span className="badge brand">
                <BadgeCheck size={12} />
                {roleLabel(user.role)}
              </span>
            </div>
            <div style={{ color: 'var(--text2)', marginTop: 2 }}>{user.title || 'No job title set'}</div>
            <div style={{ display: 'flex', gap: '8px 22px', flexWrap: 'wrap', marginTop: 14, color: 'var(--text2)', fontSize: 13.5 }}>
              <span style={row}>
                <Mail size={15} color="var(--muted)" />
                {user.email}
              </span>
              {user.phone && (
                <span style={row}>
                  <Phone size={15} color="var(--muted)" />
                  {user.phone}
                </span>
              )}
              <span style={row}>
                <CalendarDays size={15} color="var(--muted)" />
                Member since {fmtLongDate(user.createdAt)}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid cols-2" style={{ marginTop: 18, alignItems: 'start' }}>
        <div className="card">
          <div className="card-h">
            <Shield size={17} color="var(--brand)" />
            <h3>Personal details</h3>
          </div>
          <div className="card-b">
            <Field label="Full name">
              <input className="input" value={f.name} onChange={(e) => setF((s) => ({ ...s, name: e.target.value }))} />
            </Field>
            <div className="f2">
              <Field label="Job title">
                <input className="input" value={f.title} onChange={(e) => setF((s) => ({ ...s, title: e.target.value }))} />
              </Field>
              <Field label="Phone">
                <input className="input" value={f.phone} onChange={(e) => setF((s) => ({ ...s, phone: e.target.value }))} />
              </Field>
              <Field label="Email (sign-in)">
                <input className="input" value={user.email} disabled />
              </Field>
              <Field label="Role">
                <input className="input" value={roleLabel(user.role)} disabled />
              </Field>
            </div>
            <button
              className="btn primary"
              style={{ marginTop: 20 }}
              disabled={!dirty || saving || f.name.trim().length < 2}
              onClick={saveProfile}
            >
              {saving ? <Loader2 size={15} className="spin" /> : <Save size={15} />}Save changes
            </button>
          </div>
        </div>
        <ChangePasswordCard />
      </div>
      <div style={{ marginTop: 18 }}>
        <TwoFactorCard />
      </div>
      {photo && <PhotoEditor c={user} endpoint="/auth/photo" onSaved={() => void refreshMe()} onClose={() => setPhoto(false)} />}
    </>
  );
}
