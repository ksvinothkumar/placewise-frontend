import { useState, type ChangeEvent } from 'react';
import { clientsApi, type Client } from '@/api/endpoints/clients';
import { useStates } from '@/api/queries/jobs';
import { queryKeys } from '@/api/queryKeys';
import { Field, Modal } from '@/components/ui';
import { FormFoot } from './FormFoot';
import { useSave } from './useSave';

/** Create + edit a client, including GST / SEZ details. */
export function ClientForm({ client, onClose }: { client?: Client; onClose: () => void }) {
  const { data: states } = useStates();
  const [v, setV] = useState({
    name: client?.name || '',
    industry: client?.industry || '',
    city: client?.city || 'Bengaluru',
    contact: client?.contact || '',
    email: client?.email || '',
    feePct: client?.feePct ?? 8.33,
    tier: client?.tier || 'Silver',
    gstin: client?.gstin || '',
    state: client?.state || '',
    address: client?.address || '',
    pincode: client?.pincode || '',
    sez: !!client?.sez,
    sezMode: client?.sezMode || 'lut',
    guaranteeDays: client?.guaranteeDays ?? 90,
    paymentTermsDays: client?.paymentTermsDays ?? 30,
  });
  const set = (k: keyof typeof v) => (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setV((s) => ({ ...s, [k]: e.target instanceof HTMLInputElement && e.target.type === 'checkbox' ? e.target.checked : e.target.value }));
  const body = () => ({ ...v, feePct: +v.feePct, guaranteeDays: +v.guaranteeDays, paymentTermsDays: +v.paymentTermsDays });
  const [busy, save] = useSave(() => (client ? clientsApi.update(client.id, body()) : clientsApi.create(body())), {
    ok: client ? 'Client updated' : 'Client added',
    invalidate: [queryKeys.clients.all, queryKeys.jobs.all],
    onDone: onClose,
  });
  return (
    <Modal
      wide
      title={client ? 'Edit client' : 'New client'}
      sub={client ? client.name : 'Company details, fee agreement and GST information'}
      onClose={onClose}
      footer={<FormFoot onClose={onClose} busy={busy} label={client ? 'Save changes' : 'Add client'} onSave={() => save()} disabled={!v.name.trim()} />}
    >
      <Field label="Company name">
        <input className="input" autoFocus value={v.name} onChange={set('name')} />
      </Field>
      <div className="f2">
        <Field label="Industry">
          <input className="input" value={v.industry} onChange={set('industry')} />
        </Field>
        <Field label="City">
          <input className="input" value={v.city} onChange={set('city')} />
        </Field>
        <Field label="Contact person">
          <input className="input" value={v.contact} onChange={set('contact')} />
        </Field>
        <Field label="Contact email">
          <input className="input" type="email" value={v.email} onChange={set('email')} />
        </Field>
        <Field label="Fee (% of annual CTC)">
          <input className="input" type="number" step="0.01" value={v.feePct} onChange={set('feePct')} />
        </Field>
        <Field label="Tier">
          <select className="select" value={v.tier} onChange={set('tier')}>
            <option>Gold</option>
            <option>Silver</option>
            <option>Bronze</option>
          </select>
        </Field>
        <Field label="Replacement guarantee (days)">
          <input className="input" type="number" min="0" value={v.guaranteeDays} onChange={set('guaranteeDays')} />
        </Field>
        <Field label="Payment terms (days)">
          <input className="input" type="number" min="0" value={v.paymentTermsDays} onChange={set('paymentTermsDays')} />
        </Field>
      </div>
      <div style={{ marginTop: 18, paddingTop: 14, borderTop: '1px solid var(--line)' }}>
        <b>GST &amp; billing address</b>
        <span style={{ color: 'var(--muted)', fontSize: 12.5, marginLeft: 8 }}>decides CGST/SGST vs IGST on invoices</span>
      </div>
      <div className="f2">
        <Field label="State">
          <select className="select" value={v.state} onChange={set('state')}>
            <option value="">Select state…</option>
            {(states ?? []).map((x) => (
              <option key={x}>{x}</option>
            ))}
          </select>
        </Field>
        <Field label="GSTIN">
          <input
            className="input"
            placeholder="29ABCDE1234F1Z5"
            maxLength={15}
            value={v.gstin}
            onChange={(e) => setV((s) => ({ ...s, gstin: e.target.value.toUpperCase() }))}
          />
        </Field>
        <Field label="Billing address">
          <input className="input" value={v.address} onChange={set('address')} />
        </Field>
        <Field label="PIN code">
          <input className="input" value={v.pincode} onChange={set('pincode')} />
        </Field>
      </div>
      <label style={{ display: 'flex', gap: 8, marginTop: 14, alignItems: 'center' }}>
        <input type="checkbox" checked={v.sez} onChange={set('sez')} />
        This client is a SEZ unit or developer
      </label>
      {v.sez && (
        <Field label="SEZ invoicing">
          <select className="select" value={v.sezMode} onChange={set('sezMode')}>
            <option value="lut">Zero-rated under LUT (no IGST)</option>
            <option value="igst">Charge IGST</option>
          </select>
        </Field>
      )}
    </Modal>
  );
}
