import { Loader2, Mail, ShieldCheck, UserRound } from 'lucide-react';
import { useState, type ChangeEvent } from 'react';
import { usersApi, type CreateUserInput, type TeamUser, type UpdateUserInput } from '@/api/endpoints/users';
import { errorMessage } from '@/api/errors';
import { asList, useApiMutation, useApiQuery } from '@/api/hooks';
import { queryKeys } from '@/api/queryKeys';
import { Field } from '@/components/ui/Layout';
import { Modal } from '@/components/ui/Modal';
import { useSessionStore } from '@/stores/session.store';
import { toast } from '@/stores/ui.store';
import { useBranchList, useRoles, useUsers } from './hooks';
import type { SecretInfo } from './SecretModal';

const refId = (v: TeamUser['branch']) => (typeof v === 'string' ? v : (v?.id ?? ''));
const EMAIL = /\S+@\S+\.\S+/;

interface Values {
  name: string;
  email: string;
  role: string;
  title: string;
  phone: string;
  active: boolean;
  password: string;
  sendEmail: boolean;
  monthlyTarget: string | number;
  commissionPct: string | number;
  clientRef: string;
  branch: string;
  manager: string;
}

export function UserForm({ u, onClose, onSecret }: { u?: TeamUser; onClose: () => void; onSecret: (s: SecretInfo) => void }) {
  const me = useSessionStore((s) => s.user);
  const mail = useSessionStore((s) => s.mail);
  const edit = !!u;
  const self = edit && u.id === me?.id;
  const [v, setV] = useState<Values>({
    name: u?.name ?? '',
    email: u?.email ?? '',
    role: u?.role ?? 'recruiter',
    title: u?.title ?? '',
    phone: u?.phone ?? '',
    active: u?.active !== false,
    password: '',
    sendEmail: true,
    monthlyTarget: u?.monthlyTarget ?? '',
    commissionPct: u?.commissionPct ?? '',
    clientRef: refId(u?.clientRef),
    branch: refId(u?.branch),
    manager: u?.manager ?? '',
  });
  const set = (k: keyof Values) => (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setV((s) => ({ ...s, [k]: e.target.value }));
  const { data: rolesData } = useRoles();
  const { data: team } = useUsers();
  const managers = (team ?? []).filter((m) => m.id !== u?.id && m.active !== false && m.role !== 'client');
  const branches = useBranchList().data ?? [];
  const companies = asList(useApiQuery<{ id: string; name: string }[]>('/clients', undefined, { enabled: v.role === 'client' }).data);

  const num = (x: string | number): number | '' => (x === '' || x == null ? '' : Number(x));
  const save = useApiMutation(
    async () => {
      const clientRef = v.role === 'client' ? v.clientRef : undefined;
      if (u) {
        const body: UpdateUserInput = {
          name: v.name.trim(), title: v.title, phone: v.phone, role: v.role, active: v.active,
          monthlyTarget: num(v.monthlyTarget), commissionPct: num(v.commissionPct), clientRef, branch: v.branch || '', manager: v.manager,
        };
        await usersApi.update(u.id, body);
        return null;
      }
      const body: CreateUserInput = {
        name: v.name.trim(), email: v.email.trim(), role: v.role, title: v.title, phone: v.phone, sendEmail: v.sendEmail,
        clientRef, branch: v.branch || undefined, manager: v.manager || undefined, password: v.password || undefined,
      };
      return usersApi.create(body);
    },
    {
      invalidate: [queryKeys.users.all],
      onSuccess: (r) => {
        if (!r) toast('User updated');
        else {
          toast(r.email?.status === 'sent' ? `User added. Login details emailed to ${r.email.to}` : 'User added');
          if (r.tempPassword) onSecret({ title: 'User created', sub: `${r.user.name} · ${r.user.email}`, value: r.tempPassword, email: r.email });
        }
        onClose();
      },
      onError: (e) => toast(errorMessage(e), 'error'),
    },
  );

  const invalid = v.name.trim().length < 2 || (v.role === 'client' && !v.clientRef) || (!edit && !EMAIL.test(v.email));

  return (
    <Modal
      title={edit ? 'Edit team member' : 'Add team member'}
      sub={edit ? u.email : 'They can sign in right away with the password below'}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn" onClick={onClose}>Cancel</button>
          <button type="button" className="btn primary" disabled={save.isPending || invalid} onClick={() => save.mutate()}>
            {save.isPending && <Loader2 size={15} className="spin" />}{edit ? 'Save changes' : 'Add user'}
          </button>
        </>
      }
    >
      <div className="f2">
        <Field label="Full name"><input className="input" autoFocus value={v.name} onChange={set('name')} /></Field>
        <Field label="Email (sign-in)"><input className="input" type="email" value={v.email} disabled={edit} onChange={set('email')} /></Field>
        <Field label="Job title"><input className="input" value={v.title} onChange={set('title')} /></Field>
        <Field label="Phone"><input className="input" value={v.phone} onChange={set('phone')} /></Field>
      </div>
      <div className="field">
        <span id="user-role-label">Role</span>
        <div role="radiogroup" aria-labelledby="user-role-label" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {(rolesData?.roles ?? []).map((ro) => {
            const off = self && ro.key !== 'admin';
            return (
              <button
                type="button"
                role="radio"
                aria-checked={v.role === ro.key}
                key={ro.key}
                disabled={off}
                onClick={() => setV((s) => ({ ...s, role: ro.key }))}
                style={{ textAlign: 'left', padding: 12, borderRadius: 11, cursor: 'pointer', border: '2px solid ' + (v.role === ro.key ? 'var(--brand)' : 'var(--line)'), background: v.role === ro.key ? 'var(--brand-soft)' : 'var(--surface)', opacity: off ? 0.5 : 1, color: 'inherit' }}
              >
                <b style={{ display: 'flex', gap: 7, alignItems: 'center' }}>{ro.key === 'admin' ? <ShieldCheck size={16} /> : <UserRound size={16} />}{ro.name}</b>
                <span style={{ fontSize: 12.5, color: 'var(--text2)' }}>{ro.description || (ro.builtIn ? '' : 'Custom role')}</span>
              </button>
            );
          })}
        </div>
      </div>
      {v.role !== 'client' && (
        <Field label="Reporting manager">
          <select className="select" value={v.manager} onChange={set('manager')}>
            <option value="">No manager</option>
            {managers.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
        </Field>
      )}
      {branches.length > 0 && v.role !== 'client' && (
        <Field label="Branch">
          <select className="select" value={v.branch} onChange={set('branch')}>
            <option value="">No branch</option>
            {branches.filter((b) => b.active !== false).map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </Field>
      )}
      {v.role === 'client' && (
        <Field label="Client company">
          <select className="select" value={v.clientRef} onChange={set('clientRef')}>
            <option value="">Select a company…</option>
            {companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </Field>
      )}
      {edit && ['admin', 'administrator', 'hr', 'recruiter', 'team_lead', 'delivery_manager', 'junior_recruiter'].includes(v.role) && (
        <div className="f2">
          <Field label="Monthly placement target"><input className="input" type="number" min="0" placeholder="e.g. 3" value={v.monthlyTarget} onChange={set('monthlyTarget')} /></Field>
          <Field label="Commission % of fees"><input className="input" type="number" min="0" step="0.5" placeholder="e.g. 5" value={v.commissionPct} onChange={set('commissionPct')} /></Field>
        </div>
      )}
      {!edit && (
        <>
          <Field label="Password (optional)"><input className="input" type="text" placeholder="Leave blank to generate a secure temporary password" value={v.password} onChange={set('password')} /></Field>
          <label style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginTop: 16, padding: '12px 14px', border: '1px solid var(--line)', borderRadius: 10, background: 'var(--surface2)', cursor: 'pointer' }}>
            <input type="checkbox" style={{ marginTop: 3 }} checked={v.sendEmail} onChange={(e) => setV((s) => ({ ...s, sendEmail: e.target.checked }))} />
            <span>
              <b style={{ display: 'flex', gap: 7, alignItems: 'center' }}><Mail size={15} />Email login details to the user</b>
              <span style={{ color: 'var(--text2)', fontSize: 12.5 }}>
                Sends the sign-in link, their email and the {v.password ? 'password you entered' : 'generated password'}
                {!mail && ' (email delivery is not configured, so it will not actually be sent)'}.
              </span>
            </span>
          </label>
        </>
      )}
      {edit && (
        <label style={{ display: 'flex', gap: 10, alignItems: 'center', marginTop: 16 }}>
          <input type="checkbox" checked={v.active} disabled={self} onChange={(e) => setV((s) => ({ ...s, active: e.target.checked }))} />
          Account active <span style={{ color: 'var(--muted)', fontSize: 12.5 }}>(disabled users cannot sign in)</span>
        </label>
      )}
    </Modal>
  );
}
