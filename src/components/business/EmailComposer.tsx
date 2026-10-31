import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { candidateToolsApi } from '@/api/endpoints/candidate-tools';
import type { Application, CandidateRef } from '@/api/endpoints/applications';
import { errorMessage } from '@/api/errors';
import { queryKeys } from '@/api/queryKeys';
import { Field } from '@/components/ui/Layout';
import { Modal } from '@/components/ui/Modal';
import { useSessionStore } from '@/stores/session.store';
import { toast } from '@/stores/ui.store';
import { AiButton, useAi } from './ai';

export function EmailComposer({ candidate, applications = [], onClose }: { candidate: CandidateRef; applications?: Pick<Application, 'id' | 'job'>[]; onClose: () => void }) {
  const aiw = useAi();
  const qc = useQueryClient();
  const user = useSessionStore((s) => s.user);
  const mail = useSessionStore((s) => s.mail);
  const tplKey = [...queryKeys.candidates.all, 'templates'];
  const { data: tpls } = useQuery({ queryKey: tplKey, queryFn: candidateToolsApi.templates });
  const [busy, setBusy] = useState(false);
  const [job, setJob] = useState(applications[0]?.job?.title ?? '');
  const [v, setV] = useState({ subject: '', body: '' });
  const [tid, setTid] = useState('');
  const merge = (t?: string) =>
    String(t ?? '')
      .replace(/{{\s*first_name\s*}}/g, candidate.name.split(' ')[0] ?? '')
      .replace(/{{\s*name\s*}}/g, candidate.name)
      .replace(/{{\s*job\s*}}/g, job || 'the role')
      .replace(/{{\s*sender\s*}}/g, (user?.name ?? '') + '\nPlacewise');
  const pick = (id: string) => {
    setTid(id);
    const t = (tpls ?? []).find((x) => x.id === id);
    if (t) setV({ subject: merge(t.subject), body: merge(t.body) });
  };
  const send = async () => {
    setBusy(true);
    try {
      const r = await candidateToolsApi.sendEmail(candidate.id, v);
      toast(r.status === 'sent' ? `Email sent to ${r.to}` : 'Email prepared (email delivery is not configured)');
      void qc.invalidateQueries({ queryKey: queryKeys.candidates.all });
      onClose();
    } catch (e) {
      toast(errorMessage(e), 'error');
    } finally {
      setBusy(false);
    }
  };
  const saveTpl = async () => {
    const name = prompt('Template name');
    if (!name) return;
    try {
      await candidateToolsApi.saveTemplate({ name, subject: v.subject, body: v.body });
      toast('Template saved');
      void qc.invalidateQueries({ queryKey: tplKey });
    } catch (e) {
      toast(errorMessage(e), 'error');
    }
  };
  const delTpl = async () => {
    if (!tid || !confirm('Delete this template?')) return;
    try {
      await candidateToolsApi.deleteTemplate(tid);
      setTid('');
      toast('Template deleted');
      void qc.invalidateQueries({ queryKey: tplKey });
    } catch (e) {
      toast(errorMessage(e), 'error');
    }
  };
  const draft = async () => {
    const a = applications.find((x) => x.job.title === job);
    const r = await aiw.run<{ subject?: string; body?: string; text?: string }>('/outreach', { candidateId: candidate.id, jobId: a?.job.id });
    if (r) {
      setV({ subject: r.subject || v.subject, body: r.body || r.text || '' });
      setTid('');
    }
  };
  return (
    <Modal
      wide
      title="Send email"
      sub={`To ${candidate.name} · ${candidate.email || 'no email address'}`}
      onClose={onClose}
      footer={
        <>
          <button className="btn" onClick={() => void saveTpl()} disabled={!v.body}>
            Save as template
          </button>
          <span style={{ flex: 1 }} />
          <button className="btn" onClick={onClose}>
            Cancel
          </button>
          <button className="btn primary" onClick={() => void send()} disabled={busy || !candidate.email || !v.subject.trim() || !v.body.trim()}>
            {busy && <Loader2 size={15} className="spin" />}Send email
          </button>
        </>
      }
    >
      {!candidate.email && <div className="banner bad">This candidate has no email address. Edit their profile to add one.</div>}
      <div className="f2">
        <Field label="Template">
          <div style={{ display: 'flex', gap: 6 }}>
            <select className="select" value={tid} onChange={(e) => pick(e.target.value)}>
              <option value="">Start from scratch</option>
              {(tpls ?? []).map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
            {tid && (
              <button className="iconbtn" onClick={() => void delTpl()} title="Delete template" aria-label="Delete template">
                <Trash2 size={15} />
              </button>
            )}
          </div>
        </Field>
        <Field label="About job (fills {{job}})">
          {applications.length ? (
            <select className="select" value={job} onChange={(e) => setJob(e.target.value)}>
              {applications.map((a) => (
                <option key={a.id}>{a.job.title}</option>
              ))}
            </select>
          ) : (
            <input className="input" value={job} onChange={(e) => setJob(e.target.value)} placeholder="e.g. Senior Backend Engineer" />
          )}
        </Field>
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12 }}>
        <AiButton busy={aiw.busy} label="Draft with AI" onClick={() => void draft()} />
      </div>
      <Field label="Subject">
        <input className="input" value={v.subject} onChange={(e) => setV((s) => ({ ...s, subject: e.target.value }))} />
      </Field>
      <Field label="Message">
        <textarea
          className="textarea"
          style={{ minHeight: 190 }}
          value={v.body}
          onChange={(e) => setV((s) => ({ ...s, body: e.target.value }))}
          placeholder="Pick a template or write your own. Use {{first_name}}, {{job}} and {{sender}} as placeholders."
        />
      </Field>
      {!mail && <div className="banner warn">Email delivery is not configured, so this will be recorded on the timeline but not actually sent.</div>}
    </Modal>
  );
}
