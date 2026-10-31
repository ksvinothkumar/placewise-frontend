import { useState } from 'react';
import { candidatesApi, type Candidate } from '@/api/endpoints/candidates';
import { queryKeys } from '@/api/queryKeys';
import { Field, Modal } from '@/components/ui';
import { CITIES } from '@/lib/format';
import { FormFoot } from './FormFoot';
import { useSave } from './useSave';

export type CandidateDraft = Record<string, unknown>;
export const SOURCES = ['LinkedIn', 'Referral', 'Job Portal', 'Campus', 'Resume Import', 'Bulk Import', 'Careers Page', 'Direct'];

const num = (v: string) => (v === '' ? '' : +v);
const str = (v: unknown) => (v == null ? '' : String(v));

/** Shared by add, edit and resume import. `set(key, value)` receives numbers for number fields. */
export function CandidateFields({ v, set, extended = false }: { v: CandidateDraft; set: (k: string, x: unknown) => void; extended?: boolean }) {
  const f = (k: string, label: string, type = 'text') => (
    <Field label={label}>
      <input
        className="input"
        type={type}
        value={str(v[k])}
        onChange={(e) => set(k, type === 'number' ? num(e.target.value) : e.target.value)}
      />
    </Field>
  );
  return (
    <>
      <div className="f2">
        {f('name', 'Full name')}
        {f('title', 'Current title')}
        {f('company', 'Current company')}
        {f('email', 'Email', 'email')}
        {f('phone', 'Phone')}
        <Field label="City">
          <select className="select" value={str(v.city)} onChange={(e) => set('city', e.target.value)}>
            <option value="">Select…</option>
            {CITIES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </Field>
        {f('exp', 'Experience (yrs)', 'number')}
        {f('expected', 'Expected CTC (₹ LPA)', 'number')}
        {f('notice', 'Notice period (days)', 'number')}
        <Field label="Source">
          <select className="select" value={str(v.source) || 'Direct'} onChange={(e) => set('source', e.target.value)}>
            {SOURCES.map((x) => (
              <option key={x}>{x}</option>
            ))}
          </select>
        </Field>
      </div>
      <Field label="Skills (comma separated)">
        <input className="input" value={Array.isArray(v.skills) ? v.skills.join(', ') : str(v.skills)} onChange={(e) => set('skills', e.target.value)} />
      </Field>
      {extended && (
        <>
          <div className="f2">
            {f('currentCtc', 'Current CTC (₹ LPA)', 'number')}
            {f('linkedin', 'LinkedIn URL')}
          </div>
          {f('education', 'Education')}
          <Field label="Professional summary">
            <textarea className="textarea" value={str(v.summary)} onChange={(e) => set('summary', e.target.value)} />
          </Field>
        </>
      )}
    </>
  );
}

/** Numeric normalisation the legacy forms did before POST/PUT. */
export const candidateBody = (v: CandidateDraft): CandidateDraft => ({ ...v, exp: +(v.exp as number) || 0, expected: +(v.expected as number) || 0, notice: +(v.notice as number) || 0 });

export const candidateInvalidate = [queryKeys.candidates.all, queryKeys.applications.all];

export function CandidateForm({ onClose, onSaved }: { onClose: () => void; onSaved?: (c: Candidate) => void }) {
  const [v, setV] = useState<CandidateDraft>({ source: 'Direct', notice: 30, skills: '' });
  const set = (k: string, x: unknown) => setV((s) => ({ ...s, [k]: x }));
  const [busy, save] = useSave(() => candidatesApi.create(candidateBody(v)), {
    ok: 'Candidate added',
    invalidate: candidateInvalidate,
    onDone: (c) => {
      onClose();
      onSaved?.(c);
    },
  });
  return (
    <Modal
      title="New candidate"
      onClose={onClose}
      footer={<FormFoot onClose={onClose} busy={busy} label="Save candidate" onSave={() => save()} disabled={!str(v.name).trim()} />}
    >
      <CandidateFields v={v} set={set} />
    </Modal>
  );
}

export function CandidateEdit({ c, onClose }: { c: Candidate; onClose: () => void }) {
  const [v, setV] = useState<CandidateDraft>({ ...c, skills: (c.skills || []).join(', ') });
  const set = (k: string, x: unknown) => setV((s) => ({ ...s, [k]: x }));
  const [busy, save] = useSave(
    () => candidatesApi.update(c.id, { ...candidateBody(v), currentCtc: +(v.currentCtc as number) || 0 }),
    { ok: 'Profile updated', invalidate: candidateInvalidate, onDone: onClose },
  );
  return (
    <Modal
      wide
      title="Edit profile"
      sub={c.name}
      onClose={onClose}
      footer={<FormFoot onClose={onClose} busy={busy} label="Save changes" onSave={() => save()} disabled={!str(v.name).trim()} />}
    >
      <CandidateFields v={v} set={set} extended />
    </Modal>
  );
}
