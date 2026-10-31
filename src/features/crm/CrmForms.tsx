import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { crmApi, type Company, type CompanyDetail, type Contact } from '@/api/endpoints/crm';
import type { CrmStageDef } from '@/api/endpoints/settings';
import type { TeamMember } from '@/api/endpoints/notes';
import { errorMessage } from '@/api/errors';
import { useApiMutation, useApiQuery } from '@/api/hooks';
import { Foot } from '@/components/business/Foot';
import { Field } from '@/components/ui/Layout';
import { Modal } from '@/components/ui/Modal';
import { fromLocalInput, toLocalInput } from '@/lib/dates';
import { useSessionStore } from '@/stores/session.store';
import { toast } from '@/stores/ui.store';
import { crmKeys } from './useCrm';

const SOURCES = ['Referral', 'LinkedIn', 'Cold outreach', 'Inbound enquiry', 'Event', 'Existing client'];

export function CompanyForm({ company, stages, onClose, onSaved }: { company?: Company | CompanyDetail; stages: CrmStageDef[]; onClose: () => void; onSaved?: (c: Company) => void }) {
  const user = useSessionStore((s) => s.user);
  const qc = useQueryClient();
  const { data: team } = useApiQuery<TeamMember[]>('/chat/users');
  const [v, setV] = useState({
    name: company?.name ?? '',
    industry: company?.industry ?? '',
    city: company?.city ?? '',
    website: company?.website ?? '',
    source: company?.source ?? '',
    dealValue: String(company?.dealValue ?? ''),
    owner: company?.owner?.id ?? user?.id ?? '',
    stage: company?.stage ?? stages[0]?.name ?? '',
    nextFollowUp: toLocalInput(company?.nextFollowUp),
    followUpNote: company?.followUpNote ?? '',
    notes: company?.notes ?? '',
  });
  const set = (k: keyof typeof v) => (e: { target: { value: string } }) => setV((s) => ({ ...s, [k]: e.target.value }));
  const save = useApiMutation(
    () => {
      const body = { ...v, dealValue: +v.dealValue || 0, nextFollowUp: fromLocalInput(v.nextFollowUp) };
      return company ? crmApi.updateCompany(company.id, body) : crmApi.createCompany(body);
    },
    {
      onSuccess: (r) => {
        toast(company ? 'Company updated' : 'Lead added');
        void qc.invalidateQueries({ queryKey: crmKeys.all });
        onClose();
        onSaved?.(r);
      },
      onError: (e) => toast(errorMessage(e), 'error'),
    },
  );
  return (
    <Modal
      title={company ? 'Edit company' : 'New lead'}
      sub={company ? company.name : 'A company you hope to win as a client'}
      onClose={onClose}
      footer={<Foot onClose={onClose} busy={save.isPending} label="Save" onSave={() => save.mutate()} disabled={!v.name.trim()} />}
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
        <Field label="Website">
          <input className="input" placeholder="example.com" value={v.website} onChange={set('website')} />
        </Field>
        <Field label="Lead source">
          <select className="select" value={v.source} onChange={set('source')}>
            <option value="">Select…</option>
            {SOURCES.map((x) => (
              <option key={x}>{x}</option>
            ))}
          </select>
        </Field>
        <Field label="Expected annual fees (₹ lakh)">
          <input className="input" type="number" min="0" value={v.dealValue} onChange={set('dealValue')} />
        </Field>
        <Field label="Owner">
          <select className="select" value={v.owner} onChange={set('owner')}>
            <option value={user?.id}>Me</option>
            {(team ?? []).map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </select>
        </Field>
        {!company && (
          <Field label="Stage">
            <select className="select" value={v.stage} onChange={set('stage')}>
              {stages.map((s) => (
                <option key={s.key ?? s.name}>{s.name}</option>
              ))}
            </select>
          </Field>
        )}
        <Field label="Next follow-up">
          <input className="input" type="datetime-local" value={v.nextFollowUp} onChange={set('nextFollowUp')} />
        </Field>
      </div>
      <Field label="Follow-up note (included in the reminder email)">
        <input className="input" value={v.followUpNote} onChange={set('followUpNote')} placeholder="e.g. Send proposal" />
      </Field>
      <Field label="Notes">
        <textarea className="textarea" style={{ minHeight: 70 }} value={v.notes} onChange={set('notes')} />
      </Field>
    </Modal>
  );
}

export function ContactForm({ contact, companyId, stages, onClose }: { contact?: Contact; companyId?: string; stages: CrmStageDef[]; onClose: () => void }) {
  const qc = useQueryClient();
  const { data: companies } = useQuery({ queryKey: crmKeys.companies({}), queryFn: () => crmApi.companies() });
  const [v, setV] = useState({
    name: contact?.name ?? '',
    title: contact?.title ?? '',
    email: contact?.email ?? '',
    phone: contact?.phone ?? '',
    company: contact?.company?.id ?? companyId ?? '',
    stage: contact?.stage ?? stages[0]?.name ?? '',
    isPrimary: !!contact?.isPrimary,
    nextFollowUp: toLocalInput(contact?.nextFollowUp),
    followUpNote: contact?.followUpNote ?? '',
  });
  const set = (k: keyof typeof v) => (e: { target: { value: string; checked?: boolean; type?: string } }) =>
    setV((s) => ({ ...s, [k]: e.target.type === 'checkbox' ? !!e.target.checked : e.target.value }));
  const save = useApiMutation(
    () => {
      const body = { ...v, nextFollowUp: fromLocalInput(v.nextFollowUp) };
      return contact ? crmApi.updateContact(contact.id, body) : crmApi.createContact(body);
    },
    {
      onSuccess: () => {
        toast('Contact saved');
        void qc.invalidateQueries({ queryKey: crmKeys.all });
        onClose();
      },
      onError: (e) => toast(errorMessage(e), 'error'),
    },
  );
  return (
    <Modal title={contact ? 'Edit contact' : 'New contact'} onClose={onClose} footer={<Foot onClose={onClose} busy={save.isPending} label="Save" onSave={() => save.mutate()} disabled={!v.name.trim()} />}>
      <Field label="Name">
        <input className="input" autoFocus value={v.name} onChange={set('name')} />
      </Field>
      <div className="f2">
        <Field label="Title">
          <input className="input" value={v.title} onChange={set('title')} />
        </Field>
        <Field label="Company">
          <select className="select" value={v.company} onChange={set('company')}>
            <option value="">None</option>
            {(companies ?? []).map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Email">
          <input className="input" type="email" value={v.email} onChange={set('email')} />
        </Field>
        <Field label="Phone">
          <input className="input" value={v.phone} onChange={set('phone')} />
        </Field>
        <Field label="Stage">
          <select className="select" value={v.stage} onChange={set('stage')}>
            {stages.map((s) => (
              <option key={s.key ?? s.name}>{s.name}</option>
            ))}
          </select>
        </Field>
        <Field label="Next follow-up">
          <input className="input" type="datetime-local" value={v.nextFollowUp} onChange={set('nextFollowUp')} />
        </Field>
      </div>
      <label style={{ display: 'flex', gap: 8, marginTop: 14, alignItems: 'center' }}>
        <input type="checkbox" checked={v.isPrimary} onChange={set('isPrimary')} />
        Primary contact for the company
      </label>
    </Modal>
  );
}
