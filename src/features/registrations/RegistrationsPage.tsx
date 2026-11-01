import { useQuery } from '@tanstack/react-query';
import { ClipboardCheck } from 'lucide-react';
import { useState } from 'react';
import { registrationsApi, type Registration, type RegistrationStatus } from '@/api/endpoints/registrations';
import { rolesApi } from '@/api/endpoints/roles';
import { errorMessage } from '@/api/errors';
import { useApiMutation } from '@/api/hooks';
import { queryKeys } from '@/api/queryKeys';
import { FormFoot } from '@/components/forms/FormFoot';
import { EmptyState, Field, Modal, PageHead, Skeleton, Tabs } from '@/components/ui';
import { fmtDT } from '@/lib/format';
import { toast } from '@/stores/ui.store';

const TABS = [['pending', 'Pending'], ['approved', 'Approved'], ['rejected', 'Rejected']] as const;
const TONE: Record<RegistrationStatus, string> = { pending: 'warn', approved: 'good', rejected: 'bad' };

/** Workspace sign-ups from the marketing site. Approving creates the login with the password they chose. */
export function RegistrationsPage() {
  const [status, setStatus] = useState<RegistrationStatus>('pending');
  const [acting, setActing] = useState<{ reg: Registration; mode: 'approve' | 'reject' } | null>(null);
  const { data, isLoading, isError } = useQuery({
    queryKey: [...queryKeys.registrations.all, status],
    queryFn: ({ signal }) => registrationsApi.list(status, signal),
  });
  const counts = data?.counts;

  return (
    <>
      <PageHead title="Registrations" sub="People who signed up from the website. Approve to give them a login." />
      <div className="card">
        <div className="toolbar">
          <Tabs tabs={TABS.map(([k, l]) => [k, counts ? `${l} (${counts[k]})` : l] as const)} value={status} onChange={setStatus} />
        </div>
        {isLoading && !data ? (
          <Skeleton rows={5} />
        ) : data?.items.length ? (
          <table className="table">
            <thead><tr><th>Received</th><th>Workspace</th><th>Contact</th><th>Plan</th><th>Details</th><th>{status === 'pending' ? '' : 'Reviewed'}</th></tr></thead>
            <tbody>
              {data.items.map((r) => (
                <tr key={r.id}>
                  <td style={{ whiteSpace: 'nowrap', color: 'var(--text2)' }}>{fmtDT(r.createdAt)}</td>
                  <td>
                    <b>{r.workspaceName}</b>
                    <div style={{ color: 'var(--muted)', fontSize: 12.5 }}>{r.kind === 'agency' ? r.agencyName : 'Freelancer'} · /{r.workspaceSlug}</div>
                  </td>
                  <td>
                    {r.contactPerson}
                    <div style={{ fontSize: 12.5 }}><a href={'mailto:' + r.email}>{r.email}</a></div>
                    {r.mobile && <div style={{ color: 'var(--muted)', fontSize: 12.5 }}>{r.mobile}</div>}
                  </td>
                  <td><span className={'badge ' + (r.plan === 'pro' ? 'brand' : '')}>{r.plan === 'pro' ? 'Pro' : 'Free'}</span></td>
                  <td style={{ fontSize: 12.5, color: 'var(--text2)' }}>
                    {[r.country, r.website && r.website.replace(/^https?:\/\//, '')].filter(Boolean).join(' · ') || '—'}
                  </td>
                  <td style={{ whiteSpace: 'nowrap' }}>
                    {r.status === 'pending' ? (
                      <>
                        <button className="btn sm primary" onClick={() => setActing({ reg: r, mode: 'approve' })}>Approve</button>
                        <button className="btn sm" style={{ marginLeft: 6 }} onClick={() => setActing({ reg: r, mode: 'reject' })}>Reject</button>
                      </>
                    ) : (
                      <>
                        <span className={'badge ' + TONE[r.status]}>{r.status}</span>
                        <div style={{ color: 'var(--muted)', fontSize: 12.5 }} title={r.reviewNote}>
                          {r.reviewedBy}{r.reviewedAt && ' · ' + fmtDT(r.reviewedAt)}
                        </div>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <EmptyState icon={ClipboardCheck} title={isError ? 'Could not load registrations' : `No ${status} registrations`} />
        )}
      </div>
      {acting && <ReviewModal reg={acting.reg} mode={acting.mode} onClose={() => setActing(null)} />}
    </>
  );
}

function ReviewModal({ reg, mode, onClose }: { reg: Registration; mode: 'approve' | 'reject'; onClose: () => void }) {
  const [role, setRole] = useState('hr');
  const [note, setNote] = useState('');
  const { data: roles } = useQuery({ queryKey: queryKeys.roles.all, queryFn: rolesApi.list, enabled: mode === 'approve' });
  const staff = (roles?.roles ?? []).filter((r) => r.kind === 'staff');
  const run = useApiMutation(() => (mode === 'approve' ? registrationsApi.approve(reg.id, role) : registrationsApi.reject(reg.id, note)), {
    invalidate: [queryKeys.registrations.all, queryKeys.users.all],
    onSuccess: () => {
      toast(mode === 'approve' ? `Approved. ${reg.contactPerson} can log in now` : 'Registration rejected');
      onClose();
    },
    onError: (e) => toast(errorMessage(e), 'error'),
  });
  return (
    <Modal
      title={mode === 'approve' ? 'Approve registration' : 'Reject registration'}
      sub={`${reg.workspaceName} · ${reg.email}`}
      onClose={onClose}
      footer={<FormFoot onClose={onClose} busy={run.isPending} label={mode === 'approve' ? 'Approve and create login' : 'Reject'} onSave={() => run.mutate()} />}
    >
      {mode === 'approve' ? (
        <>
          <p style={{ color: 'var(--text2)', marginTop: 0 }}>
            This creates a login for <b>{reg.contactPerson}</b> with the password they chose, and emails them that they are approved.
          </p>
          <Field label="Role">
            <select className="select" value={role} onChange={(e) => setRole(e.target.value)}>
              {(staff.length ? staff : [{ key: 'hr', name: 'HR' }]).map((r) => <option key={r.key} value={r.key}>{r.name}</option>)}
            </select>
          </Field>
        </>
      ) : (
        <Field label="Reason (sent to the applicant, optional)">
          <textarea className="input" rows={3} maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} />
        </Field>
      )}
    </Modal>
  );
}
