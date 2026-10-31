import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useApiMutation, useApiQuery } from '@/api/hooks';
import { errorMessage } from '@/api/errors';
import { dashboardKey } from '@/api/endpoints/dashboard';
import { tasksApi, type TaskPriority } from '@/api/endpoints/tasks';
import type { TeamMember } from '@/api/endpoints/notes';
import { queryKeys } from '@/api/queryKeys';
import { Field } from '@/components/ui/Layout';
import { Modal } from '@/components/ui/Modal';
import { fromLocalInput, toLocalInput } from '@/lib/dates';
import { useSessionStore } from '@/stores/session.store';
import { toast } from '@/stores/ui.store';
import { Foot } from './Foot';

export function TaskForm({ onClose, candidate, job }: { onClose: () => void; candidate?: { id: string; name: string }; job?: { id: string } }) {
  const user = useSessionStore((s) => s.user);
  const { data: team } = useApiQuery<TeamMember[]>('/chat/users');
  const qc = useQueryClient();
  const tomorrow = new Date(Date.now() + 864e5);
  tomorrow.setHours(10, 0, 0, 0);
  const [v, setV] = useState({ title: '', notes: '', due: toLocalInput(tomorrow), priority: 'Medium' as TaskPriority, assignee: user?.id ?? '' });
  const set = (k: keyof typeof v) => (e: { target: { value: string } }) => setV((s) => ({ ...s, [k]: e.target.value }));
  const save = useApiMutation(
    () => tasksApi.create({ ...v, due: fromLocalInput(v.due) || undefined, candidate: candidate?.id, job: job?.id }),
    {
      onSuccess: () => {
        toast('Task added');
        void qc.invalidateQueries({ queryKey: queryKeys.tasks.all });
        void qc.invalidateQueries({ queryKey: dashboardKey });
        onClose();
      },
      onError: (e) => toast(errorMessage(e), 'error'),
    },
  );
  return (
    <Modal
      title="New task"
      sub={candidate ? `About ${candidate.name}` : 'Follow-ups, calls and reminders'}
      onClose={onClose}
      footer={<Foot onClose={onClose} busy={save.isPending} label="Add task" onSave={() => save.mutate()} disabled={v.title.trim().length < 2} />}
    >
      <Field label="What needs doing?">
        <input className="input" autoFocus placeholder="e.g. Call back about the offer" value={v.title} onChange={set('title')} />
      </Field>
      <div className="f2">
        <Field label="Due">
          <input className="input" type="datetime-local" value={v.due} onChange={set('due')} />
        </Field>
        <Field label="Priority">
          <select className="select" value={v.priority} onChange={set('priority')}>
            <option>High</option>
            <option>Medium</option>
            <option>Low</option>
          </select>
        </Field>
      </div>
      <Field label="Assign to">
        <select className="select" value={v.assignee} onChange={set('assignee')}>
          <option value={user?.id}>Me</option>
          {(team ?? [])
            .filter((u) => u.role !== 'client')
            .map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
        </select>
      </Field>
      <Field label="Notes (optional)">
        <textarea className="textarea" style={{ minHeight: 70 }} value={v.notes} onChange={set('notes')} />
      </Field>
    </Modal>
  );
}
