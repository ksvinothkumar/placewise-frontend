import { Paginated } from '@/components/ui/Paginated';
import { Building2, GitBranch, Loader2, Pencil, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { branchesApi, type Branch, type BranchInput } from '@/api/endpoints/settings';
import { errorMessage } from '@/api/errors';
import { useApiMutation } from '@/api/hooks';
import { queryKeys } from '@/api/queryKeys';
import { EmptyState } from '@/components/ui/EmptyState';
import { Field } from '@/components/ui/Layout';
import { Modal } from '@/components/ui/Modal';
import { Skeleton } from '@/components/ui/Skeleton';
import { toast } from '@/stores/ui.store';
import { settingsKeys, useBranches } from './hooks';

type Form = BranchInput & { id?: string };

export function BranchesTab() {
  const { data, isLoading } = useBranches();
  const [f, setF] = useState<Form | null>(null);
  const invalidate = [settingsKeys.branches, queryKeys.users.all];

  const save = useApiMutation(({ id, ...body }: Form) => (id ? branchesApi.update(id, body) : branchesApi.create(body)), {
    invalidate,
    onSuccess: () => {
      toast('Branch saved');
      setF(null);
    },
    onError: (e) => toast(errorMessage(e), 'error'),
  });
  const remove = useApiMutation((b: Branch) => branchesApi.remove(b.id), {
    invalidate,
    onSuccess: () => toast('Branch deleted'),
    onError: (e) => toast(errorMessage(e), 'error'),
  });
  const del = (b: Branch) => {
    if (confirm(`Delete "${b.name}"? ${b.users} user(s) and ${b.jobs} job(s) will be unassigned.`)) remove.mutate(b);
  };

  return (
    <div className="card">
      <div className="card-h">
        <GitBranch size={17} color="var(--brand)" />
        <h3>Branches</h3>
        <small>offices or teams. Assign people and jobs to a branch to filter by it.</small>
        <button type="button" className="btn sm primary" style={{ marginLeft: 'auto' }} onClick={() => setF({ name: '', code: '', city: '' })}>
          <Plus size={13} />Add branch
        </button>
      </div>
      {isLoading && !data ? (
        <Skeleton rows={3} />
      ) : data?.length ? (
        <Paginated items={data} render={(pageRows, from) => (
        <table className="table" style={{ marginTop: 12 }}>
          <thead>
            <tr><th className="sn">#</th><th>Branch</th><th>City</th><th>People</th><th>Jobs</th><th /></tr>
          </thead>
          <tbody>
            {pageRows.map((b, n) => (
              <tr key={b.id}><td className="sn">{from + n + 1}</td>
                <td><b>{b.name}</b>{b.code && <span className="badge" style={{ marginLeft: 8 }}>{b.code}</span>}</td>
                <td>{b.city || '—'}</td>
                <td>{b.users}</td>
                <td>{b.jobs}</td>
                <td style={{ textAlign: 'right' }}>
                  <button type="button" className="btn sm" onClick={() => setF(b)} aria-label={`Edit ${b.name}`}><Pencil size={13} />Edit</button>{' '}
                  <button type="button" className="btn sm danger" onClick={() => del(b)} aria-label={`Delete ${b.name}`}><Trash2 size={13} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        )} />
      ) : (
        <EmptyState icon={Building2} title="No branches yet" sub="Add one if you work from several offices." />
      )}
      {f && (
        <Modal
          title={f.id ? 'Edit branch' : 'New branch'}
          onClose={() => setF(null)}
          footer={
            <>
              <button type="button" className="btn" onClick={() => setF(null)}>Cancel</button>
              <button type="button" className="btn primary" disabled={save.isPending || !f.name.trim()} onClick={() => save.mutate({ id: f.id, name: f.name.trim(), code: f.code, city: f.city })}>
                {save.isPending && <Loader2 size={15} className="spin" />}Save
              </button>
            </>
          }
        >
          <Field label="Name"><input className="input" autoFocus value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
          <div className="f2">
            <Field label="Code"><input className="input" value={f.code ?? ''} onChange={(e) => setF({ ...f, code: e.target.value })} /></Field>
            <Field label="City"><input className="input" value={f.city ?? ''} onChange={(e) => setF({ ...f, city: e.target.value })} /></Field>
          </div>
        </Modal>
      )}
    </div>
  );
}
