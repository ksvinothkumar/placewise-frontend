import { Paginated } from '@/components/ui/Paginated';
import { KeyRound, MoreVertical, Pencil, Plus, Power, Search, ShieldCheck } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { usersApi, type TeamUser } from '@/api/endpoints/users';
import { errorMessage } from '@/api/errors';
import { useApiMutation } from '@/api/hooks';
import { queryKeys } from '@/api/queryKeys';
import { CandidatePhoto } from '@/components/ui/Avatar';
import { PageHead } from '@/components/ui/Layout';
import { Skeleton } from '@/components/ui/Skeleton';
import { fmtDate, roleLabel } from '@/lib/format';
import { useSessionStore } from '@/stores/session.store';
import { toast } from '@/stores/ui.store';
import { useRoles, useUsers } from './hooks';
import { SecretModal, type SecretInfo } from './SecretModal';
import { UserForm } from './UserForm';

/** Everyone below `id` in the reporting chain: they cannot be picked as that person's manager (it would loop). */
function reportsOf(id: string, all: TeamUser[]): Set<string> {
  const out = new Set<string>();
  const walk = (m: string) => all.forEach((u) => u.manager === m && !out.has(u.id) && (out.add(u.id), walk(u.id)));
  walk(id);
  return out;
}

const selectStyle = { width: 190, maxWidth: '100%' } as const;

export function UsersPage() {
  const { data, isLoading } = useUsers();
  const { data: rolesData } = useRoles();
  const me = useSessionStore((s) => s.user);
  const [form, setForm] = useState<{ u?: TeamUser } | null>(null);
  const [secret, setSecret] = useState<SecretInfo | null>(null);
  const [menu, setMenu] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const menuRef = useRef<HTMLDivElement>(null);
  const all = useMemo(() => data ?? [], [data]);
  const needle = q.toLowerCase();
  const list = all.filter((u) => !q || `${u.name}${u.email}${u.title ?? ''}`.toLowerCase().includes(needle));
  const staffRoles = (rolesData?.roles ?? []).filter((r) => r.kind === 'staff');
  const nameOf = (id?: string | null) => all.find((u) => u.id === id)?.name;

  useEffect(() => {
    if (!menu) return;
    const close = (e: MouseEvent) => !menuRef.current?.contains(e.target as Node) && setMenu(null);
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setMenu(null);
    addEventListener('mousedown', close);
    addEventListener('keydown', esc);
    return () => {
      removeEventListener('mousedown', close);
      removeEventListener('keydown', esc);
    };
  }, [menu]);

  const change = useApiMutation((v: { u: TeamUser; patch: { role?: string; manager?: string; active?: boolean } }) => usersApi.update(v.u.id, v.patch), {
    invalidate: [queryKeys.users.all, queryKeys.roles.all],
    onSuccess: (_r, v) => toast(v.patch.role ? `${v.u.name} is now ${roleLabel(v.patch.role)}` : v.patch.active !== undefined ? (v.patch.active ? `${v.u.name} enabled` : `${v.u.name} disabled`) : 'Reporting manager updated'),
    onError: (e) => toast(errorMessage(e), 'error'),
  });
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
  const busy = (u: TeamUser) => change.isPending && change.variables?.u.id === u.id;

  return (
    <>
      <PageHead title="Team" sub="Who can sign in, what they can do, and who they report to">
        <Link className="btn" to="/roles"><ShieldCheck size={16} />Roles &amp; access</Link>
        <button type="button" className="btn primary" onClick={() => setForm({})}><Plus size={16} />Add team member</button>
      </PageHead>
      <div className="card">
        <div className="toolbar">
          <div className="search">
            <Search size={16} />
            <input className="input" placeholder="Search team…" aria-label="Search team" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <span style={{ color: 'var(--muted)', marginLeft: 'auto' }}>{all.length} people</span>
        </div>
        {isLoading && !data ? (
          <Skeleton />
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <Paginated items={list} render={(pageRows, from) => (
            <table className="table">
              <thead>
                <tr><th className="sn">#</th><th>Member</th><th>Email</th><th>Role</th><th>Reporting manager</th><th>Status</th><th>Joined</th><th style={{ width: 48 }} /></tr>
              </thead>
              <tbody>
                {pageRows.map((u, n) => {
                  const isMe = u.id === me?.id;
                  const blocked = reportsOf(u.id, all);
                  const options = all.filter((m) => m.id !== u.id && m.active !== false && m.role !== 'client' && !blocked.has(m.id));
                  const roleKnown = staffRoles.some((r) => r.key === u.role);
                  return (
                    <tr key={u.id}><td className="sn">{from + n + 1}</td>
                      <td>
                        <div className="who">
                          <CandidatePhoto c={u} size={38} path={isMe ? '/auth/photo' : undefined} />
                          <b>{u.name}{isMe && <span style={{ marginLeft: 6, fontWeight: 400, color: 'var(--muted)' }}>(you)</span>}</b>
                        </div>
                      </td>
                      <td style={{ color: 'var(--text2)' }}>{u.email}</td>
                      <td>
                        {isMe || u.role === 'client' ? (
                          <span style={{ color: 'var(--text2)' }}>{roleLabel(u.role)}</span>
                        ) : (
                          <select className="select" style={selectStyle} aria-label={`Role for ${u.name}`} value={u.role} disabled={busy(u)} onChange={(e) => change.mutate({ u, patch: { role: e.target.value } })}>
                            {!roleKnown && <option value={u.role}>{roleLabel(u.role)}</option>}
                            {staffRoles.map((r) => <option key={r.key} value={r.key}>{r.name}</option>)}
                          </select>
                        )}
                      </td>
                      <td>
                        {u.role === 'client' ? (
                          <span style={{ color: 'var(--muted)' }}>—</span>
                        ) : (
                          <select className="select" style={selectStyle} aria-label={`Reporting manager for ${u.name}`} value={u.manager ?? ''} disabled={busy(u)} onChange={(e) => change.mutate({ u, patch: { manager: e.target.value } })}>
                            <option value="">No manager</option>
                            {u.manager && !options.some((m) => m.id === u.manager) && <option value={u.manager}>{nameOf(u.manager) ?? 'Former member'}</option>}
                            {options.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                          </select>
                        )}
                      </td>
                      <td>
                        {u.active === false ? <span className="badge bad">Disabled</span> : <span className="badge good">Active</span>}{' '}
                        {u.totpEnabled && <span className="badge info" title="Two-step verification is on"><ShieldCheck size={11} />2FA</span>}
                      </td>
                      <td style={{ color: 'var(--text2)', whiteSpace: 'nowrap' }}>{u.createdAt ? fmtDate(u.createdAt) : '—'}</td>
                      <td style={{ position: 'relative', textAlign: 'right' }}>
                        <button type="button" className="iconbtn" aria-label={`Actions for ${u.name}`} aria-expanded={menu === u.id} onClick={() => setMenu(menu === u.id ? null : u.id)}>
                          <MoreVertical size={17} />
                        </button>
                        {menu === u.id && (
                          <div ref={menuRef} className="row-menu" role="menu">
                            <button type="button" role="menuitem" onClick={() => (setMenu(null), setForm({ u }))}><Pencil size={14} />Edit details</button>
                            <button type="button" role="menuitem" aria-label={`Reset password for ${u.name}`} onClick={() => (setMenu(null), askReset(u))}><KeyRound size={14} />Reset password &amp; email</button>
                            {u.totpEnabled && (
                              <button type="button" role="menuitem" aria-label={`Reset two-step verification for ${u.name}`} onClick={() => (setMenu(null), askReset2fa(u))}><ShieldCheck size={14} />Reset 2FA</button>
                            )}
                            {!isMe && (
                              <button type="button" role="menuitem" className={u.active === false ? '' : 'danger'} onClick={() => (setMenu(null), change.mutate({ u, patch: { active: u.active === false } }))}>
                                <Power size={14} />{u.active === false ? 'Enable account' : 'Disable account'}
                              </button>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            )} />
          </div>
        )}
      </div>
      {form && <UserForm u={form.u} onClose={() => setForm(null)} onSecret={setSecret} />}
      {secret && <SecretModal {...secret} onClose={() => setSecret(null)} />}
    </>
  );
}
