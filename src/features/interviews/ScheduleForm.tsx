import { useQuery } from '@tanstack/react-query';
import { Mail } from 'lucide-react';
import { useEffect, useState } from 'react';
import { applicationsApi } from '@/api/endpoints/applications';
import { interviewsApi, type Interview } from '@/api/endpoints/interviews';
import { errorMessage } from '@/api/errors';
import { useApiMutation } from '@/api/hooks';
import { queryKeys } from '@/api/queryKeys';
import { Foot } from '@/components/business/Foot';
import { Field } from '@/components/ui/Layout';
import { Modal } from '@/components/ui/Modal';
import { toLocalInput } from '@/lib/dates';
import { isTerminalStage } from '@/lib/format';
import { useSessionStore } from '@/stores/session.store';
import { toast } from '@/stores/ui.store';
import { inviteToast, useRefreshInterviews } from './useInterviews';

interface Form {
  application: string;
  when: string;
  duration: number | string;
  mode: string;
  round: string;
  interviewer: string;
  location: string;
  notes: string;
  sendInvite: boolean;
}

/** Schedule a new interview or reschedule an existing one (port of forms.jsx ScheduleForm). */
export function ScheduleForm({ onClose, initialDate, interview }: { onClose: () => void; initialDate?: string; interview?: Interview }) {
  const edit = !!interview;
  const mail = useSessionStore((s) => s.mail);
  const refresh = useRefreshInterviews();
  const { data: apps } = useQuery({ queryKey: queryKeys.applications.list(), queryFn: () => applicationsApi.list() });
  const base = initialDate ? `${initialDate}T11:00` : toLocalInput(Date.now() + 864e5).slice(0, 11) + '11:00';
  const [v, setV] = useState<Form>(
    interview
      ? { application: '', when: toLocalInput(interview.when), duration: interview.duration || 60, mode: interview.mode, round: interview.round || '', interviewer: interview.interviewer, location: interview.location || '', notes: interview.notes || '', sendInvite: true }
      : { application: '', when: base, duration: 60, mode: 'Video', round: 'Technical Round 1', interviewer: '', location: '', notes: '', sendInvite: true },
  );
  const open = (apps ?? []).filter((a) => !isTerminalStage(a.stage));
  const cur = edit ? null : (open.find((a) => a.id === (v.application || open[0]?.id)) ?? null);
  const cand = interview ? interview.application.candidate : cur?.candidate;
  const email = cand?.email;
  const willSend = interview ? !!interview.inviteStatus && v.sendInvite && !!email : v.sendInvite && !!email;
  const curId = cur?.id;
  const curContact = cur?.job.client?.contact;
  useEffect(() => {
    // pre-fill the interviewer with the client contact once the first application is known
    if (curId && curContact) setV((s) => (s.interviewer ? s : { ...s, interviewer: curContact }));
  }, [curId, curContact]);
  const set = (k: keyof Form) => (e: { target: { value: string } }) => setV((s) => ({ ...s, [k]: e.target.value }));

  const save = useApiMutation(
    async () => {
      const body = { ...v, duration: +v.duration, when: new Date(v.when).toISOString(), sendInvite: willSend };
      const r = interview ? await interviewsApi.update(interview.id, body) : await interviewsApi.create({ ...body, application: cur!.id });
      inviteToast(r.invite, interview ? 'Interview updated' : 'Interview scheduled');
      return r;
    },
    { onSuccess: () => { refresh(); onClose(); }, onError: (e) => toast(errorMessage(e), 'error') },
  );

  return (
    <Modal
      wide
      title={edit ? 'Reschedule interview' : 'Schedule interview'}
      sub={interview ? `${interview.application.candidate.name} · ${interview.application.job.title}` : 'Double-bookings for the same interviewer are blocked'}
      onClose={onClose}
      footer={<Foot onClose={onClose} busy={save.isPending} label={edit ? (willSend ? 'Save & send update' : 'Save changes') : willSend ? 'Schedule & send invite' : 'Schedule'} onSave={() => save.mutate()} disabled={!edit && !cur} />}
    >
      {!edit && (
        <Field label="Candidate & job">
          <select
            className="select"
            value={cur?.id || ''}
            onChange={(e) => setV((s) => ({ ...s, application: e.target.value, interviewer: open.find((a) => a.id === e.target.value)?.job.client?.contact || '' }))}
          >
            {open.map((a) => (
              <option key={a.id} value={a.id}>
                {a.candidate.name} · {a.job.title}
              </option>
            ))}
          </select>
        </Field>
      )}
      <div className="f2">
        <Field label="Date & time">
          <input className="input" type="datetime-local" value={v.when} onChange={set('when')} />
        </Field>
        <Field label="Duration">
          <select className="select" value={v.duration} onChange={set('duration')}>
            {[30, 45, 60, 90, 120].map((m) => (
              <option key={m} value={m}>
                {m} minutes
              </option>
            ))}
          </select>
        </Field>
        <Field label="Mode">
          <select className="select" value={v.mode} onChange={set('mode')}>
            <option>Video</option>
            <option>In-person</option>
            <option>Phone</option>
          </select>
        </Field>
        <Field label="Round">
          <input className="input" value={v.round} onChange={set('round')} />
        </Field>
        <Field label="Interviewer">
          <input className="input" value={v.interviewer} onChange={set('interviewer')} />
        </Field>
        <Field label={v.mode === 'Video' ? 'Meeting link' : v.mode === 'In-person' ? 'Venue / address' : 'Dial-in number'}>
          <input className="input" placeholder={v.mode === 'Video' ? 'https://meet.google.com/…' : ''} value={v.location} onChange={set('location')} />
        </Field>
      </div>
      <Field label="Note to candidate (optional)">
        <textarea className="textarea" style={{ minHeight: 70 }} placeholder="e.g. Please keep your laptop and a stable internet connection ready." value={v.notes} onChange={set('notes')} />
      </Field>
      {(!interview || interview.inviteStatus) && (
        <label style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginTop: 16, padding: '12px 14px', border: '1px solid var(--line)', borderRadius: 10, background: 'var(--surface2)', cursor: email ? 'pointer' : 'not-allowed' }}>
          <input type="checkbox" style={{ marginTop: 3 }} disabled={!email} checked={v.sendInvite && !!email} onChange={(e) => setV((s) => ({ ...s, sendInvite: e.target.checked }))} />
          <span>
            <b style={{ display: 'flex', gap: 7, alignItems: 'center' }}>
              <Mail size={15} />
              {edit ? 'Email the updated invite to candidate' : 'Email invite to candidate'}
            </b>
            <span style={{ color: 'var(--text2)', fontSize: 12.5 }}>
              {email ? (
                <>
                  To <b>{email}</b>, with a calendar (.ics) attachment.{!mail && ' Email delivery is not configured, so it will only be prepared for preview.'}
                </>
              ) : (
                'This candidate has no email address. Add one to send an invite.'
              )}
            </span>
          </span>
        </label>
      )}
    </Modal>
  );
}
