import { useState } from 'react';
import { Ban, ShieldCheck } from 'lucide-react';
import { blockedApi, type BlockInput } from '@/api/endpoints/blocked';
import { errorMessage } from '@/api/errors';
import { useApiMutation } from '@/api/hooks';
import { useBlocked } from '@/api/queries/candidates';
import { queryKeys } from '@/api/queryKeys';
import { Modal } from '@/components/ui/Modal';
import { Field } from '@/components/ui/Layout';
import { Skeleton } from '@/components/ui/Skeleton';
import { useCan } from '@/lib/permissions';
import { toast } from '@/stores/ui.store';

const refresh = [queryKeys.candidates.all];

export const useUnblock = () =>
  useApiMutation((id: string) => blockedApi.remove(id), {
    invalidate: refresh,
    onSuccess: () => toast('Unblocked. This email can apply again'),
    onError: (e) => toast(errorMessage(e), 'error'),
  });

/** Asks for an optional reason, then blocks a candidate's email (or a bare address). */
export function BlockDialog({ target, onClose }: { target: BlockInput & { label: string }; onClose: () => void }) {
  const [reason, setReason] = useState('');
  const block = useApiMutation((b: BlockInput) => blockedApi.add(b), {
    invalidate: refresh,
    onSuccess: () => {
      toast('Blocked from reapplying');
      onClose();
    },
    onError: (e) => toast(errorMessage(e), 'error'),
  });
  const { label, ...body } = target;
  return (
    <Modal
      title={`Block ${label}?`}
      sub="Their email can no longer apply on the careers page, be added by hand, or come in through resume imports. Their record and history stay."
      onClose={onClose}
      footer={
        <>
          <button className="btn" onClick={onClose}>
            Cancel
          </button>
          <button className="btn danger" disabled={block.isPending} onClick={() => block.mutate({ ...body, reason })}>
            <Ban size={15} />
            Block
          </button>
        </>
      }
    >
      <Field label="Reason (only your team sees this)">
        <textarea className="input" rows={3} maxLength={500} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Submitted fake documents" />
      </Field>
    </Modal>
  );
}

/** Everyone on the blocklist, with Unblock, plus a way to block an address that isn't in the talent pool. */
export function BlockedModal({ onClose }: { onClose: () => void }) {
  const canWrite = useCan('candidates:write');
  const { data, isLoading } = useBlocked();
  const unblock = useUnblock();
  const [adding, setAdding] = useState(false);
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [target, setBlockTarget] = useState<(BlockInput & { label: string }) | null>(null);
  return (
    <>
      <Modal wide title="Blocked candidates" sub="These emails can't apply, be added, or be imported." onClose={onClose}>
        {canWrite && (
          <div style={{ marginBottom: 14 }}>
            <button className="btn sm" onClick={() => setAdding(true)}>
              <Ban size={14} />
              Block an email
            </button>
          </div>
        )}
        {isLoading ? (
          <Skeleton rows={4} />
        ) : !data?.length ? (
          <div className="empty">
            <ShieldCheck size={34} strokeWidth={1.5} color="var(--good)" />
            <b>No one is blocked</b>Block a candidate from their profile.
          </div>
        ) : (
          <ul className="list">
            {data.map((b) => (
              <li key={b.id} style={{ alignItems: 'center' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <b>{b.name || b.email}</b>
                  {b.name && <span style={{ color: 'var(--muted)', fontSize: 12.5 }}> · {b.email}</span>}
                  <div style={{ fontSize: 12.5, color: 'var(--text2)' }}>
                    {[b.reason, b.blockedByName && `by ${b.blockedByName}`].filter(Boolean).join(' · ') || 'No reason given'}
                  </div>
                </div>
                {canWrite && (
                  <button className="btn sm" disabled={unblock.isPending} onClick={() => confirm(`Unblock ${b.email}?`) && unblock.mutate(b.id)}>
                    Unblock
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </Modal>
      {adding && (
        <Modal
          title="Block an email"
          onClose={() => setAdding(false)}
          footer={
            <>
              <button className="btn" onClick={() => setAdding(false)}>
                Cancel
              </button>
              <button
                className="btn danger"
                disabled={!email.includes('@')}
                onClick={() => {
                  setAdding(false);
                  setBlockTarget({ email, name: name || undefined, label: email });
                }}
              >
                Continue
              </button>
            </>
          }
        >
          <Field label="Email">
            <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoFocus />
          </Field>
          <Field label="Name (optional)">
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
        </Modal>
      )}
      {target && <BlockDialog target={target} onClose={() => setBlockTarget(null)} />}
    </>
  );
}
