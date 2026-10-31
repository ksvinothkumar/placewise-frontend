import { Copy, Loader2, Lock, Plus, Save, ShieldCheck, Trash2, Users } from 'lucide-react';
import { useState, type KeyboardEvent } from 'react';
import { rolesApi, type PermissionModule, type RoleRow } from '@/api/endpoints/roles';
import { errorMessage } from '@/api/errors';
import { useApiMutation } from '@/api/hooks';
import { queryKeys } from '@/api/queryKeys';
import { Field, PageHead } from '@/components/ui/Layout';
import { Modal } from '@/components/ui/Modal';
import { Skeleton } from '@/components/ui/Skeleton';
import { useSessionStore } from '@/stores/session.store';
import { toast } from '@/stores/ui.store';
import { useRoles } from './hooks';

interface Draft {
  key: string;
  perms: Set<string>;
}
interface NewRole {
  name: string;
  copyFrom: string;
}

const activate = (fn: () => void) => (e: KeyboardEvent) => {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    fn();
  }
};

export function RolesPage() {
  const { data, isLoading } = useRoles();
  const refreshMe = useSessionStore((s) => s.refreshMe);
  const [sel, setSel] = useState('hr');
  const [draft, setDraft] = useState<Draft | null>(null);
  const [mk, setMk] = useState<NewRole | null>(null);

  const roles = data?.roles ?? [];
  const role: RoleRow | undefined = roles.find((r) => r.key === sel) ?? roles[0];
  const dirty = !!draft && draft.key === role?.key;
  const perms = draft && draft.key === role?.key ? draft.perms : new Set(role?.permissions ?? []);
  const locked = !!role && (role.key === 'admin' || role.kind === 'client');

  const save = useApiMutation((v: { key: string; permissions: string[] }) => rolesApi.savePermissions(v.key, v.permissions), {
    invalidate: [queryKeys.roles.all],
    onSuccess: async () => {
      toast('Permissions saved. They apply immediately.');
      setDraft(null);
      await refreshMe().catch(() => undefined); // the signed-in user may hold the edited role
    },
    onError: (e) => toast(errorMessage(e), 'error'),
  });
  const remove = useApiMutation((key: string) => rolesApi.remove(key), {
    invalidate: [queryKeys.roles.all, queryKeys.users.all],
    onSuccess: () => {
      toast('Role deleted');
      setSel('hr');
    },
    onError: (e) => toast(errorMessage(e), 'error'),
  });
  const create = useApiMutation((v: NewRole) => rolesApi.create({ name: v.name.trim(), copyFrom: v.copyFrom }), {
    invalidate: [queryKeys.roles.all],
    onSuccess: (r) => {
      toast('Role created');
      setMk(null);
      setSel(r.key);
    },
    onError: (e) => toast(errorMessage(e), 'error'),
  });

  if (isLoading && !data) {
    return (
      <>
        <PageHead title="Roles & access" />
        <div className="card"><Skeleton rows={8} /></div>
      </>
    );
  }

  const change = (fn: (next: Set<string>) => void) => {
    if (locked || !role) return;
    const next = new Set(perms);
    fn(next);
    setDraft({ key: role.key, perms: next });
  };
  const toggle = (p: string) => change((n) => (n.has(p) ? n.delete(p) : n.add(p)));
  const toggleModule = (m: PermissionModule, on: boolean) => change((n) => m.perms.forEach(([p]) => (on ? n.add(p) : n.delete(p))));
  const select = (key: string) => {
    setSel(key);
    setDraft(null);
  };

  return (
    <>
      <PageHead title="Roles & access" sub="Decide exactly what each role can see and do. Changes apply immediately.">
        <button type="button" className="btn primary" onClick={() => setMk({ name: '', copyFrom: role?.kind === 'staff' ? role.key : '' })}>
          <Plus size={16} />New role
        </button>
      </PageHead>
      <div className="grid" style={{ gridTemplateColumns: '280px minmax(0,1fr)', alignItems: 'start' }}>
        <div className="card" style={{ padding: 8 }} role="listbox" aria-label="Roles">
          {roles.map((r) => (
            <div
              key={r.key}
              role="option"
              aria-selected={r.key === role?.key}
              tabIndex={0}
              className={'chat-item ' + (r.key === role?.key ? 'on' : '')}
              style={{ borderRadius: 10 }}
              onClick={() => select(r.key)}
              onKeyDown={activate(() => select(r.key))}
            >
              <div className="chan" style={{ width: 36, height: 36, background: r.kind === 'client' ? 'var(--muted)' : undefined }}>
                {r.key === 'admin' ? <ShieldCheck size={17} /> : <Users size={17} />}
              </div>
              <div className="mid">
                <div className="row1"><b>{r.name}</b></div>
                <div className="prev">{r.users} user{r.users === 1 ? '' : 's'}{r.builtIn ? ' · built-in' : ' · custom'}</div>
              </div>
            </div>
          ))}
        </div>
        {role && (
          <div className="card">
            <div className="card-h">
              <h3>{role.name}</h3>
              {locked && <span className="badge"><Lock size={11} />Fixed</span>}
              <small>{role.description}</small>
              <span style={{ flex: 1 }} />
              <button type="button" className="btn sm" onClick={() => setMk({ name: role.name + ' copy', copyFrom: role.key })} disabled={role.kind === 'client'}>
                <Copy size={13} />Duplicate
              </button>
              {!role.builtIn && (
                <button
                  type="button"
                  className="btn sm danger"
                  disabled={remove.isPending}
                  onClick={() => confirm(`Delete the role "${role.name}"?`) && remove.mutate(role.key)}
                >
                  <Trash2 size={13} />Delete
                </button>
              )}
            </div>
            <div className="card-b">
              {locked && (
                <div className="banner" style={{ marginBottom: 14 }}>
                  {role.key === 'admin' ? 'Admin always has full access so you can never lock yourself out.' : 'The Client role is for the customer portal and cannot be customised.'}
                </div>
              )}
              <div style={{ display: 'grid', gap: 14 }}>
                {role.kind !== 'client' &&
                  (data?.catalog ?? []).map((m) => {
                    const all = m.perms.every(([p]) => perms.has(p));
                    return (
                      <div key={m.module} role="group" aria-label={m.module} style={{ border: '1px solid var(--line)', borderRadius: 12, padding: '12px 14px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 6 }}>
                          <b style={{ flex: 1 }}>{m.module}</b>
                          {!locked && (
                            <button type="button" className="btn sm ghost" onClick={() => toggleModule(m, !all)} aria-label={`${all ? 'Clear' : 'Select all'} ${m.module} permissions`}>
                              {all ? 'Clear' : 'Select all'}
                            </button>
                          )}
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(230px,1fr))', gap: '6px 18px' }}>
                          {m.perms.map(([p, label]) => (
                            <label key={p} style={{ display: 'flex', gap: 9, alignItems: 'center', cursor: locked ? 'default' : 'pointer', fontSize: 13.5 }}>
                              <input type="checkbox" checked={perms.has(p)} disabled={locked} onChange={() => toggle(p)} />
                              {label}
                            </label>
                          ))}
                        </div>
                      </div>
                    );
                  })}
              </div>
              {role.kind === 'client' && <div style={{ color: 'var(--text2)' }}>Client users only see their own company's roles and shortlisted candidates through the portal.</div>}
              {!locked && (
                <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginTop: 18, position: 'sticky', bottom: 0, background: 'var(--surface)', padding: '10px 0' }}>
                  <span style={{ color: 'var(--text2)' }} aria-live="polite">{perms.size} permission{perms.size === 1 ? '' : 's'} selected</span>
                  <span style={{ flex: 1 }} />
                  {dirty && <button type="button" className="btn" onClick={() => setDraft(null)}>Discard</button>}
                  <button type="button" className="btn primary" disabled={!dirty || save.isPending} onClick={() => save.mutate({ key: role.key, permissions: [...perms] })}>
                    {save.isPending ? <Loader2 size={15} className="spin" /> : <Save size={15} />}Save changes
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
      {mk && (
        <Modal
          title="New role"
          sub="Start from an existing role and adjust it afterwards"
          onClose={() => setMk(null)}
          footer={
            <>
              <button type="button" className="btn" onClick={() => setMk(null)}>Cancel</button>
              <button type="button" className="btn primary" disabled={create.isPending || mk.name.trim().length < 2} onClick={() => create.mutate(mk)}>
                {create.isPending && <Loader2 size={15} className="spin" />}Create role
              </button>
            </>
          }
        >
          <Field label="Role name"><input className="input" autoFocus placeholder="e.g. Senior Recruiter" value={mk.name} onChange={(e) => setMk({ ...mk, name: e.target.value })} /></Field>
          <Field label="Start with the permissions of">
            <select className="select" value={mk.copyFrom} onChange={(e) => setMk({ ...mk, copyFrom: e.target.value })}>
              <option value="">Nothing (blank)</option>
              {roles.filter((r) => r.kind === 'staff').map((r) => <option key={r.key} value={r.key}>{r.name}</option>)}
            </select>
          </Field>
        </Modal>
      )}
    </>
  );
}
