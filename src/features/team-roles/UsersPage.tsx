import { Check, KeyRound, Pencil, Plus, Search, ShieldCheck, UserRound, X as XIcon } from 'lucide-react';
import { useState } from 'react';
import { usersApi, type TeamUser } from '@/api/endpoints/users';
import { errorMessage } from '@/api/errors';
import { useApiMutation } from '@/api/hooks';
import { queryKeys } from '@/api/queryKeys';
import { CandidatePhoto } from '@/components/ui/Avatar';
import { PageHead } from '@/components/ui/Layout';
import { Skeleton } from '@/components/ui/Skeleton';
import { roleLabel } from '@/lib/format';
import { useSessionStore } from '@/stores/session.store';
import { toast } from '@/stores/ui.store';
import { useUsers } from './hooks';
import { SecretModal, type SecretInfo } from './SecretModal';
import { UserForm } from './UserForm';

const ago = (d?: string | null) => {
  if (!d) return 'Never';
  const m = (Date.now() - new Date(d).getTime()) / 6e4;
  return m < 60 ? Math.max(1, Math.floor(m)) + 'm ago' : m < 1440 ? Math.floor(m / 60) + 'h ago' : Math.floor(m / 1440) + 'd ago';
};
const MATRIX: [string, boolean, boolean][] = [
  ['View dashboard, jobs, candidates, pipeline, interviews', true, true],
  ['Add / edit jobs and candidates, import resumes', true, true],
  ['Move candidates through the pipeline, schedule interviews', true, true],
  ['See client fee agreements, revenue and forecast', true, false],
  ['Add / edit clients', true, false],
  ['Delete jobs, candidates and clients', true, false],
  ['Manage team members, roles and passwords', true, false],
  ['Create and track invoices, view the audit log', true, false],
];
const name = (v: { name: string } | string | null | undefined) => (typeof v === 'object' && v ? v.name : undefined);

export function UsersPage() {
  const { data, isLoading } = useUsers();
  const me = useSessionStore((s) => s.user);
  const [form, setForm] = useState<{ u?: TeamUser } | null>(null);
  const [secret, setSecret] = useState<SecretInfo | null>(null);
  const [q, setQ] = useState('');
  const needle = q.toLowerCase();
  const list = (data ?? []).filter((u) => !q || `${u.name}${u.email}${u.title ?? ''}`.toLowerCase().includes(needle));

  const reset = useApiMutation((u: TeamUser) => usersApi.resetPassword(u.id), {
    onSuccess: (r, u) => {
      toast(r.email?.status === 'sent' ? `New password emailed to ${r.email.to}` : 'Password reset');
      setSecret({ title: 'Password reset', sub: `${u.name} · ${u.email}`, value: r.tempPassword, email: r.email });
    },
    onError: (e) => toast(errorMessage(e), 'error'),
  });
  const reset2fa = useApiMutation((u: TeamUser) => usersApi.reset2fa(u.id), {
    invalidate: [queryKeys.users.all],
    onSuccess: () => toast('Two-step verification reset'),
    onError: (e) => toast(errorMessage(e), 'error'),
  });
  const askReset = (u: TeamUser) => {
    if (confirm(`Reset the password for ${u.name}? Their current password will stop working and the new one will be emailed to ${u.email}.`)) reset.mutate(u);
  };
  const askReset2fa = (u: TeamUser) => {
    if (confirm(`Turn off two-step verification for ${u.name}? They can set it up again after signing in.`)) reset2fa.mutate(u);
  };

  return (
    <>
      <PageHead title="Team" sub="Manage who can sign in and what they can do">
        <button type="button" className="btn primary" onClick={() => setForm({})}><Plus size={16} />Add team member</button>
      </PageHead>
      <div className="card">
        <div className="toolbar">
          <div className="search">
            <Search size={16} />
            <input className="input" placeholder="Search team…" aria-label="Search team" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <span style={{ color: 'var(--muted)', marginLeft: 'auto' }}>{data?.length ?? 0} people</span>
        </div>
        {isLoading && !data ? (
          <Skeleton />
        ) : (
          <table className="table">
            <thead>
              <tr><th>Member</th><th>Role</th><th>Status</th><th>Last sign-in</th><th style={{ width: 210 }} /></tr>
            </thead>
            <tbody>
              {list.map((u) => (
                <tr key={u.id}>
                  <td>
                    <div className="who">
                      <CandidatePhoto c={u} size={38} path={u.id === me?.id ? '/auth/photo' : undefined} />
                      <div>
                        <b>{u.name}{u.id === me?.id && <span className="badge" style={{ marginLeft: 8 }}>You</span>}</b>
                        <span>{u.email}{u.title && ` · ${u.title}`}</span>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className={'badge ' + (u.role === 'admin' ? 'brand' : u.role === 'finance' ? 'warn' : 'info')}>
                      {u.role === 'admin' ? <ShieldCheck size={12} /> : <UserRound size={12} />}{roleLabel(u.role)}
                    </span>
                    {name(u.branch) && <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 3 }}>{name(u.branch)}</div>}
                    {u.role === 'client' && name(u.clientRef) && <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 3 }}>{name(u.clientRef)}</div>}
                  </td>
                  <td>
                    {u.active === false ? <span className="badge bad">Disabled</span> : <span className="badge good">Active</span>}{' '}
                    {u.totpEnabled && <span className="badge info" title="Two-step verification is on"><ShieldCheck size={11} />2FA</span>}
                  </td>
                  <td style={{ color: 'var(--text2)' }}>{ago(u.lastLoginAt)}</td>
                  <td style={{ textAlign: 'right' }}>
                    <button type="button" className="btn sm" onClick={() => setForm({ u })} aria-label={`Edit ${u.name}`}><Pencil size={13} />Edit</button>{' '}
                    <button type="button" className="btn sm" onClick={() => askReset(u)} aria-label={`Reset password for ${u.name}`}><KeyRound size={13} />Reset &amp; email</button>
                    {u.totpEnabled && (
                      <>
                        {' '}
                        <button type="button" className="btn sm" title="Remove this person's two-step verification (for a lost phone)" aria-label={`Reset two-step verification for ${u.name}`} onClick={() => askReset2fa(u)}>
                          <ShieldCheck size={13} />Reset 2FA
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <div className="card" style={{ marginTop: 18 }}>
        <div className="card-h"><ShieldCheck size={17} color="var(--brand)" /><h3>What each role can do</h3></div>
        <div className="card-b" style={{ paddingTop: 8 }}>
          <table className="table">
            <thead>
              <tr><th>Permission</th><th style={{ width: 90, textAlign: 'center' }}>Admin</th><th style={{ width: 90, textAlign: 'center' }}>HR</th></tr>
            </thead>
            <tbody>
              {MATRIX.map(([t, a, h]) => (
                <tr key={t}>
                  <td>{t}</td>
                  {[a, h].map((ok, i) => (
                    <td key={i} style={{ textAlign: 'center' }}>
                      {ok ? <Check size={17} color="var(--good)" aria-label="Allowed" /> : <XIcon size={17} color="var(--muted)" aria-label="Not allowed" />}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {form && <UserForm u={form.u} onClose={() => setForm(null)} onSecret={setSecret} />}
      {secret && <SecretModal {...secret} onClose={() => setSecret(null)} />}
    </>
  );
}
