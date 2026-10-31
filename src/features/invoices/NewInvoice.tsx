import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { invoicesApi } from '@/api/endpoints/invoices';
import { errorMessage } from '@/api/errors';
import { useApiMutation, useApiQuery, asList } from '@/api/hooks';
import { queryKeys } from '@/api/queryKeys';
import { Foot } from '@/components/business/Foot';
import { Field } from '@/components/ui/Layout';
import { Modal } from '@/components/ui/Modal';
import { toast } from '@/stores/ui.store';

export function NewInvoice({ onClose }: { onClose: () => void }) {
  const nav = useNavigate();
  const qc = useQueryClient();
  const { data: clients } = useApiQuery<{ id: string; name: string }[] | { items: { id: string; name: string }[] }>('/clients');
  const [v, setV] = useState<{ client: string; docType: 'tax' | 'proforma'; amount: string; description: string }>({ client: '', docType: 'tax', amount: '', description: '' });
  const save = useApiMutation(() => invoicesApi.create({ ...v, amount: +v.amount }), {
    onSuccess: (r) => {
      toast(`${r.number} created`);
      void qc.invalidateQueries({ queryKey: queryKeys.invoices.all });
      onClose();
      nav('/invoices/' + r.id);
    },
    onError: (e) => toast(errorMessage(e), 'error'),
  });
  return (
    <Modal
      title="New invoice"
      sub="For anything that isn't an automatic placement fee, such as a retainer or a project fee"
      onClose={onClose}
      footer={<Foot onClose={onClose} busy={save.isPending} label="Create draft" onSave={() => save.mutate()} disabled={!v.client || !(+v.amount > 0) || !v.description.trim()} />}
    >
      <div className="f2">
        <Field label="Client">
          <select className="select" value={v.client} onChange={(e) => setV({ ...v, client: e.target.value })}>
            <option value="">Select…</option>
            {asList(clients).map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Document">
          <select className="select" value={v.docType} onChange={(e) => setV({ ...v, docType: e.target.value as 'tax' | 'proforma' })}>
            <option value="tax">Tax invoice</option>
            <option value="proforma">Proforma invoice</option>
          </select>
        </Field>
      </div>
      <Field label="Amount before GST (₹)">
        <input className="input" type="number" min="1" value={v.amount} onChange={(e) => setV({ ...v, amount: e.target.value })} />
      </Field>
      <Field label="Description">
        <input className="input" placeholder="e.g. Monthly recruitment retainer, November" value={v.description} onChange={(e) => setV({ ...v, description: e.target.value })} />
      </Field>
      <div className="banner">GST is added automatically: CGST + SGST for clients in your state, IGST for other states, and zero-rated for SEZ clients. Set each client's state and GSTIN on the Clients page.</div>
    </Modal>
  );
}
