import { useState, type ChangeEvent } from 'react';
import { jobsApi, type Job, type JobInput } from '@/api/endpoints/jobs';
import { useBranches, useClients } from '@/api/queries/jobs';
import { queryKeys } from '@/api/queryKeys';
import { AiButton, useAi } from '@/components/business/ai';
import { Field, Modal } from '@/components/ui';
import { CITIES } from '@/lib/format';
import { FormFoot } from './FormFoot';
import { useSave } from './useSave';

type JobDraft = Record<keyof Omit<JobInput, 'branch'>, string | number | boolean> & { branch: string };

/** Pure validation, exported for tests. Returns the first problem, or '' when the draft can be saved. */
export function jobProblem(v: Pick<JobDraft, 'title' | 'expMin' | 'expMax' | 'salMin' | 'salMax' | 'openings'>): string {
  if (!String(v.title).trim()) return 'Job title is required';
  if (+v.expMin < 0 || +v.expMax < +v.expMin) return 'Maximum experience must be at least the minimum';
  if (+v.salMin < 0 || +v.salMax < +v.salMin) return 'Maximum salary must be at least the minimum';
  if (!(+v.openings >= 1)) return 'At least one opening is required';
  return '';
}

export function JobForm({ onClose, onSaved }: { onClose: () => void; onSaved?: (j: Job) => void }) {
  const aiw = useAi();
  const { data: branches } = useBranches();
  const { data: clients } = useClients();
  const [v, setV] = useState<JobDraft>({
    title: '',
    client: '',
    city: 'Bengaluru',
    remote: false,
    skills: '',
    expMin: 3,
    expMax: 8,
    salMin: 15,
    salMax: 30,
    openings: 1,
    priority: 'Medium',
    description: '',
    public: false,
    branch: '',
  });
  const [touched, setTouched] = useState(false);
  const set = (k: keyof JobDraft) => (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setV((s) => ({ ...s, [k]: e.target instanceof HTMLInputElement && e.target.type === 'checkbox' ? e.target.checked : e.target.value }));
  const clientId = (v.client as string) || clients?.[0]?.id || '';
  const problem = jobProblem(v);
  const [busy, save] = useSave(
    () =>
      jobsApi.create({
        ...(v as unknown as JobInput),
        client: clientId,
        expMin: +v.expMin,
        expMax: +v.expMax,
        salMin: +v.salMin,
        salMax: +v.salMax,
        openings: +v.openings,
        branch: v.branch || undefined,
      }),
    { ok: 'Job created', invalidate: [queryKeys.jobs.all, queryKeys.clients.all], onDone: (j) => { onClose(); onSaved?.(j); } },
  );
  const submit = () => {
    setTouched(true);
    if (!problem) save();
  };
  return (
    <Modal
      title="New job"
      sub="Create a requisition for a client"
      onClose={onClose}
      footer={<FormFoot onClose={onClose} busy={busy} label="Create job" onSave={submit} disabled={!String(v.title).trim()} />}
    >
      <Field label="Job title">
        <input className="input" autoFocus placeholder="e.g. Senior Java Developer" value={v.title as string} onChange={set('title')} />
      </Field>
      <div className="f2">
        <Field label="Client">
          <select className="select" value={clientId} onChange={set('client')}>
            {(clients ?? []).map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="City">
          <select className="select" value={v.city as string} onChange={set('city')}>
            {CITIES.filter((c) => c !== 'Remote').map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </Field>
        <Field label="Experience min (yrs)">
          <input className="input" type="number" value={v.expMin as number} onChange={set('expMin')} />
        </Field>
        <Field label="Experience max (yrs)">
          <input className="input" type="number" value={v.expMax as number} onChange={set('expMax')} />
        </Field>
        <Field label="Salary min (₹ LPA)">
          <input className="input" type="number" value={v.salMin as number} onChange={set('salMin')} />
        </Field>
        <Field label="Salary max (₹ LPA)">
          <input className="input" type="number" value={v.salMax as number} onChange={set('salMax')} />
        </Field>
        <Field label="Openings">
          <input className="input" type="number" min="1" value={v.openings as number} onChange={set('openings')} />
        </Field>
        <Field label="Priority">
          <select className="select" value={v.priority as string} onChange={set('priority')}>
            <option>High</option>
            <option>Medium</option>
            <option>Low</option>
          </select>
        </Field>
      </div>
      <Field label="Required skills (comma separated)">
        <input className="input" placeholder="python, sql, aws" value={v.skills as string} onChange={set('skills')} />
      </Field>
      {!!branches?.length && (
        <Field label="Branch">
          <select className="select" value={v.branch} onChange={set('branch')}>
            <option value="">No branch</option>
            {branches
              .filter((b) => b.active !== false)
              .map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
          </select>
        </Field>
      )}
      <Field label="Job description (shown on the careers page)">
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 6 }}>
          <AiButton
            busy={aiw.busy}
            disabled={!String(v.title).trim()}
            onClick={async () => {
              const cl = (clients ?? []).find((c) => c.id === clientId);
              const r = await aiw.run<{ text: string }>('/job-description', {
                title: v.title,
                skills: v.skills,
                city: v.city,
                expMin: +v.expMin,
                expMax: +v.expMax,
                industry: cl?.industry,
              });
              if (r) setV((x) => ({ ...x, description: r.text }));
            }}
          />
        </div>
        <textarea
          className="textarea"
          style={{ minHeight: 110 }}
          placeholder="What the role involves, what you need, what's on offer… (or let AI draft it from the title and skills)"
          value={v.description as string}
          onChange={set('description')}
        />
      </Field>
      <div style={{ display: 'flex', gap: 22, marginTop: 14, flexWrap: 'wrap' }}>
        <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input type="checkbox" checked={!!v.remote} onChange={set('remote')} />
          Remote friendly
        </label>
        <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input type="checkbox" checked={!!v.public} onChange={set('public')} />
          Publish on the careers page
        </label>
      </div>
      {touched && problem && (
        <div className="banner bad" role="alert" style={{ marginTop: 14 }}>
          {problem}
        </div>
      )}
    </Modal>
  );
}
