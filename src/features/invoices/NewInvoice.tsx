import { useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  invoicesApi,
  type BillingMode,
  type DocType,
  type Invoice,
  type InvoiceUpdate,
  type NewInvoiceBody,
} from '@/api/endpoints/invoices';
import { errorMessage } from '@/api/errors';
import { useApiMutation, useApiQuery, asList } from '@/api/hooks';
import { queryKeys } from '@/api/queryKeys';
import { Foot } from '@/components/business/Foot';
import { Field } from '@/components/ui/Layout';
import { Modal } from '@/components/ui/Modal';
import { inr } from '@/lib/format';
import { toast } from '@/stores/ui.store';

interface ClientOption {
  id: string;
  name: string;
  gstin?: string;
  address?: string;
  city?: string;
  state?: string;
}
interface Line {
  description: string;
  candidateName: string;
  designation: string;
  joiningDate: string;
  annualCtc: string;
  feePct: string;
  /** typed charge; null = work it out from annual CTC x fee % */
  charges: string | null;
  rate: string;
  hours: string;
}
const blankLine = (): Line => ({
  description: '',
  candidateName: '',
  designation: '',
  joiningDate: '',
  annualCtc: '',
  feePct: '',
  charges: null,
  rate: '',
  hours: '',
});

export const DEFAULT_LUT = 'SUPPLY OF SERVICES MEANT FOR SEZ UNIT UNDER LETTER OF UNDERTAKING WITHOUT PAYMENT OF INTEGRATED TAX';
const TYPES: Array<[DocType, string]> = [
  ['proforma', 'Proforma Invoice'],
  ['tax', 'Tax Invoice'],
  ['sez', 'SEZ Invoice'],
];
const MODES: Array<[BillingMode, string]> = [
  ['ctc', 'CTC % Billing'],
  ['hourly', 'Hourly Billing'],
];
const today = () => new Date().toISOString().slice(0, 10);
const fy = () => {
  const d = new Date();
  const y = d.getMonth() >= 3 ? d.getFullYear() : d.getFullYear() - 1;
  return `${y}-${String(y + 1).slice(2)}`;
};
const PREFIX: Record<DocType, string> = { proforma: 'PF', tax: 'INV', sez: 'SEZ' };

/** What a line comes to before GST: hourly = rate x hours; CTC = the typed charge, else annual CTC x fee %. */
export const lineAmount = (mode: BillingMode, l: Line): number => {
  if (mode === 'hourly') return Math.round((+l.rate || 0) * (+l.hours || 0));
  if (l.charges !== null && l.charges !== '') return Math.round(+l.charges || 0);
  return Math.round(((+l.annualCtc || 0) * (+l.feePct || 0)) / 100);
};

const day = (d?: string) => (d ? d.slice(0, 10) : '');
const fromInvoice = (i: Invoice) => ({
  v: {
    number: '',
    client: '',
    buyerName: i.billTo?.name ?? i.clientName ?? '',
    buyerGstin: i.billTo?.gstin ?? '',
    buyerAddress: i.billTo?.address ?? '',
    buyerState: i.billTo?.state ?? '',
    issueDate: day(i.issueDate),
    dueDate: day(i.dueDate),
    registeredName: i.billTo?.registeredName ?? '',
    internalRemarks: i.internalRemarks ?? '',
    lutText: i.lutText ?? DEFAULT_LUT,
  },
  lines: (i.lineItems ?? []).map<Line>((l) => ({
    description: l.description ?? '',
    candidateName: l.candidateName ?? '',
    designation: l.designation ?? '',
    joiningDate: day(l.joiningDate),
    annualCtc: l.annualCtc ? String(l.annualCtc) : '',
    feePct: l.feePct ? String(l.feePct) : '',
    charges: String(l.amount),
    rate: l.rate ? String(l.rate) : '',
    hours: l.hours ? String(l.hours) : '',
  })),
});

/** Creates an invoice, or with `edit` (a draft built from line items) changes it in place. */
export function NewInvoice({ onClose, edit }: { onClose: () => void; edit?: Invoice }) {
  const init = edit ? fromInvoice(edit) : null;
  const nav = useNavigate();
  const qc = useQueryClient();
  const { data: clients } = useApiQuery<ClientOption[] | { items: ClientOption[] }>('/clients');
  const states = useApiQuery<string[]>('/settings/states', undefined, { staleTime: Infinity });
  const [docType, setDocType] = useState<DocType>(edit?.docType ?? 'tax');
  const [mode, setMode] = useState<BillingMode>(edit?.billingMode ?? 'ctc');
  const [v, setV] = useState(
    init?.v ?? {
      number: '',
      client: '',
      buyerName: '',
      buyerGstin: '',
      buyerAddress: '',
      buyerState: '',
      issueDate: today(),
      dueDate: '',
      registeredName: '',
      internalRemarks: '',
      lutText: DEFAULT_LUT,
    },
  );
  const [lines, setLines] = useState<Line[]>(init?.lines.length ? init.lines : [blankLine()]);
  const set = (k: keyof typeof v) => (e: { target: { value: string } }) => setV({ ...v, [k]: e.target.value });
  const setLine = (i: number, patch: Partial<Line>) => setLines(lines.map((l, j) => (j === i ? { ...l, ...patch } : l)));

  const pickClient = (id: string) => {
    const c = asList(clients).find((x) => x.id === id);
    setV(
      c
        ? {
            ...v,
            client: id,
            buyerName: c.name,
            buyerGstin: c.gstin ?? '',
            buyerAddress: [c.address, c.city].filter(Boolean).join(', '),
            buyerState: c.state ?? '',
          }
        : { ...v, client: '' },
    );
  };

  const amounts = lines.map((l) => lineAmount(mode, l));
  const subtotal = amounts.reduce((t, n) => t + n, 0);
  const ready =
    !!v.buyerName.trim() &&
    !!v.buyerState &&
    amounts.every((n) => n > 0) &&
    lines.every((l) => l.description.trim() || l.candidateName.trim());

  const body = (): NewInvoiceBody => ({
    docType,
    billingMode: mode,
    number: v.number.trim() || undefined,
    client: v.client || undefined,
    buyerName: v.buyerName.trim(),
    buyerGstin: v.buyerGstin.trim() || undefined,
    buyerAddress: v.buyerAddress.trim() || undefined,
    buyerState: v.buyerState,
    registeredName: v.registeredName.trim() || undefined,
    issueDate: v.issueDate || undefined,
    dueDate: v.dueDate || undefined,
    internalRemarks: v.internalRemarks.trim() || undefined,
    lutText: docType === 'sez' ? v.lutText.trim() || undefined : undefined,
    lineItems: lines.map((l, i) => ({
      description: l.description.trim() || undefined,
      candidateName: l.candidateName.trim() || undefined,
      designation: l.designation.trim() || undefined,
      ...(mode === 'hourly'
        ? { rate: +l.rate, hours: +l.hours }
        : {
            joiningDate: l.joiningDate || undefined,
            annualCtc: l.annualCtc ? +l.annualCtc : undefined,
            feePct: l.feePct ? +l.feePct : undefined,
            amount: amounts[i],
          }),
    })),
  });

  const linked = !!edit?.client; // a linked client's name, address and state come from the client record
  const changes = (): InvoiceUpdate => {
    const b = body();
    return {
      docType: b.docType,
      ...(linked
        ? {}
        : { buyerName: b.buyerName, buyerGstin: v.buyerGstin.trim(), buyerAddress: v.buyerAddress.trim(), buyerState: b.buyerState }),
      registeredName: v.registeredName.trim(),
      dueDate: b.dueDate,
      internalRemarks: v.internalRemarks.trim(),
      ...(docType === 'sez' ? { lutText: b.lutText } : {}),
      lineItems: b.lineItems,
    };
  };
  const save = useApiMutation(() => (edit ? invoicesApi.patch(edit.id, changes()) : invoicesApi.create(body())), {
    onSuccess: (r) => {
      toast(edit ? 'Draft updated' : `${r.number} created`);
      void qc.invalidateQueries({ queryKey: queryKeys.invoices.all });
      onClose();
      if (!edit) nav('/invoices/' + r.id);
    },
    onError: (e) => toast(errorMessage(e), 'error'),
  });

  return (
    <Modal
      wide
      title={edit ? `Edit ${edit.number}` : 'New invoice'}
      sub="Proforma, tax or SEZ, billed on candidate CTC or by the hour"
      onClose={onClose}
      footer={
        <Foot
          onClose={onClose}
          busy={save.isPending}
          label={edit ? 'Save changes' : 'Create draft'}
          onSave={() => save.mutate()}
          disabled={!ready}
        />
      }
    >
      <div role="group" aria-label="Invoice type" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
        {TYPES.map(([k, l]) => (
          <button
            key={k}
            type="button"
            aria-pressed={docType === k}
            className={'btn' + (docType === k ? ' primary' : '')}
            onClick={() => setDocType(k)}
          >
            {l}
          </button>
        ))}
      </div>
      <div
        role="group"
        aria-label="Billing type"
        style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8, margin: '8px 0 14px' }}
      >
        {MODES.map(([k, l]) => (
          <button
            key={k}
            type="button"
            aria-pressed={mode === k}
            className={'btn' + (mode === k ? ' primary' : '')}
            disabled={!!edit && mode !== k}
            title={edit ? 'Billing type is fixed once the invoice is created' : undefined}
            onClick={() => setMode(k)}
          >
            {l}
          </button>
        ))}
      </div>

      {docType === 'sez' && (
        <Field label="LUT Declaration Text">
          <textarea className="textarea" style={{ minHeight: 64 }} value={v.lutText} onChange={set('lutText')} />
        </Field>
      )}
      {!edit && (
        <>
          <Field label="Invoice Number (optional - leave blank to auto-generate)">
            <input className="input" placeholder={`e.g. ${PREFIX[docType]}/${fy()}/0008`} value={v.number} onChange={set('number')} />
          </Field>
          <Field label="Existing Client (optional - autofills name/address, links for revenue tracking)">
            <select className="select" aria-label="Existing client" value={v.client} onChange={(e) => pickClient(e.target.value)}>
              <option value="">None - enter manually below</option>
              {asList(clients).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </Field>
        </>
      )}
      <div className="f2">
        <Field label="Buyer Company Name *">
          <input className="input" aria-label="Buyer company name" disabled={linked} value={v.buyerName} onChange={set('buyerName')} />
        </Field>
        <Field label="Buyer GSTIN">
          <input
            className="input"
            aria-label="Buyer GSTIN"
            maxLength={15}
            value={v.buyerGstin}
            onChange={(e) => setV({ ...v, buyerGstin: e.target.value.toUpperCase() })}
          />
        </Field>
      </div>
      <Field label="Buyer Address">
        <textarea
          className="textarea"
          style={{ minHeight: 64 }}
          aria-label="Buyer address"
          disabled={linked}
          value={v.buyerAddress}
          onChange={set('buyerAddress')}
        />
      </Field>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12 }}>
        <Field label="Buyer State *">
          <select className="select" aria-label="Buyer state" disabled={linked} value={v.buyerState} onChange={set('buyerState')}>
            <option value="">Select…</option>
            {(states.data ?? []).map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </Field>
        <Field label="Invoice Date">
          <input
            className="input"
            type="date"
            aria-label="Invoice date"
            disabled={!!edit}
            value={v.issueDate}
            onChange={set('issueDate')}
          />
        </Field>
        <Field label="Due Date">
          <input className="input" type="date" aria-label="Due date" value={v.dueDate} onChange={set('dueDate')} />
        </Field>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', margin: '14px 0 6px' }}>
        <b style={{ fontSize: 13 }}>Line Items</b>
        <button type="button" className="btn ghost sm" style={{ marginLeft: 'auto' }} onClick={() => setLines([...lines, blankLine()])}>
          <Plus size={14} />
          Add Item
        </button>
      </div>
      <div style={{ display: 'grid', gap: 10 }}>
        {lines.map((l, i) => (
          <div
            key={i}
            role="group"
            aria-label={`Line item ${i + 1}`}
            style={{ border: '1px solid var(--line)', borderRadius: 10, padding: 10, display: 'grid', gap: 8 }}
          >
            <input
              className="input"
              placeholder="Description (e.g. Recruitment Services)"
              aria-label={`Description ${i + 1}`}
              value={l.description}
              onChange={(e) => setLine(i, { description: e.target.value })}
            />
            <div className="f2">
              <input
                className="input"
                placeholder="Candidate name"
                aria-label={`Candidate name ${i + 1}`}
                value={l.candidateName}
                onChange={(e) => setLine(i, { candidateName: e.target.value })}
              />
              <input
                className="input"
                placeholder="Designation"
                aria-label={`Designation ${i + 1}`}
                value={l.designation}
                onChange={(e) => setLine(i, { designation: e.target.value })}
              />
            </div>
            {mode === 'ctc' ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 8 }}>
                <input
                  className="input"
                  type="date"
                  aria-label={`Joining date ${i + 1}`}
                  value={l.joiningDate}
                  onChange={(e) => setLine(i, { joiningDate: e.target.value })}
                />
                <input
                  className="input"
                  type="number"
                  min="0"
                  placeholder="Annual CTC (₹)"
                  aria-label={`Annual CTC ${i + 1}`}
                  value={l.annualCtc}
                  onChange={(e) => setLine(i, { annualCtc: e.target.value })}
                />
                <input
                  className="input"
                  type="number"
                  min="0"
                  max="100"
                  step="any"
                  placeholder="Fee %"
                  aria-label={`Fee % ${i + 1}`}
                  value={l.feePct}
                  onChange={(e) => setLine(i, { feePct: e.target.value })}
                />
                <input
                  className="input"
                  type="number"
                  min="0"
                  placeholder="Charges (₹) *"
                  aria-label={`Charges ${i + 1}`}
                  value={l.charges ?? (amounts[i] ? String(amounts[i]) : '')}
                  onChange={(e) => setLine(i, { charges: e.target.value })}
                />
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 8 }}>
                <input
                  className="input"
                  type="number"
                  min="0"
                  placeholder="Rate/hr (₹)"
                  aria-label={`Rate per hour ${i + 1}`}
                  value={l.rate}
                  onChange={(e) => setLine(i, { rate: e.target.value })}
                />
                <input
                  className="input"
                  type="number"
                  min="0"
                  step="any"
                  placeholder="Hours worked"
                  aria-label={`Hours worked ${i + 1}`}
                  value={l.hours}
                  onChange={(e) => setLine(i, { hours: e.target.value })}
                />
                <input
                  className="input"
                  placeholder="Amount (₹)"
                  aria-label={`Amount ${i + 1}`}
                  value={amounts[i] ? String(amounts[i]) : ''}
                  readOnly
                  disabled
                />
              </div>
            )}
            {lines.length > 1 && (
              <button
                type="button"
                className="btn ghost sm"
                style={{ justifySelf: 'end' }}
                aria-label={`Remove line ${i + 1}`}
                onClick={() => setLines(lines.filter((_, j) => j !== i))}
              >
                <Trash2 size={13} />
                Remove
              </button>
            )}
          </div>
        ))}
      </div>
      <div style={{ textAlign: 'right', margin: '8px 2px 14px', color: 'var(--text2)' }}>
        Sub-total before GST: <b>{inr(subtotal)}</b>
      </div>

      <div className="f2">
        <Field label="Registered Name (for GST, if different from above)">
          <input
            className="input"
            placeholder="Legal registered entity name"
            aria-label="Registered name"
            value={v.registeredName}
            onChange={set('registeredName')}
          />
        </Field>
        <Field label="Internal Remarks (GST/payment notes - not shown to client)">
          <textarea
            className="textarea"
            style={{ minHeight: 44 }}
            aria-label="Internal remarks"
            value={v.internalRemarks}
            onChange={set('internalRemarks')}
          />
        </Field>
      </div>
      <div className="banner">
        {docType === 'sez'
          ? 'SEZ invoices are zero-rated under the Letter of Undertaking, so no GST is added.'
          : 'GST is added automatically: CGST + SGST when the buyer is in your state, IGST for other states.'}
      </div>
    </Modal>
  );
}
