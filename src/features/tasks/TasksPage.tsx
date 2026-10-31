import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CalendarClock, ListChecks, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { dashboardKey } from '@/api/endpoints/dashboard';
import { tasksApi, type Task } from '@/api/endpoints/tasks';
import { errorMessage, type ApiError } from '@/api/errors';
import { queryKeys } from '@/api/queryKeys';
import { TaskForm } from '@/components/business/TaskForm';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageHead } from '@/components/ui/Layout';
import { Skeleton } from '@/components/ui/Skeleton';
import { sod, shortDT } from '@/lib/dates';
import { useSessionStore } from '@/stores/session.store';
import { toast } from '@/stores/ui.store';

export function TasksPage() {
  const user = useSessionStore((s) => s.user);
  const qc = useQueryClient();
  const [tab, setTab] = useState<'open' | 'done'>('open');
  const [scope, setScope] = useState<'mine' | 'all'>('mine');
  const [form, setForm] = useState(false);
  const query = { status: tab, scope };
  const key = queryKeys.tasks.list(query);
  const { data, isLoading } = useQuery({ queryKey: key, queryFn: () => tasksApi.list(query) });
  const refresh = () => {
    void qc.invalidateQueries({ queryKey: queryKeys.tasks.all });
    void qc.invalidateQueries({ queryKey: dashboardKey });
  };
  const toggle = useMutation<Task, ApiError, Task>({
    mutationFn: (t) => tasksApi.setDone(t.id, !t.done),
    onError: (e) => toast(errorMessage(e), 'error'),
    onSettled: refresh,
  });
  const del = useMutation<unknown, ApiError, Task>({
    mutationFn: (t) => tasksApi.remove(t.id),
    onSuccess: () => toast('Task deleted'),
    onError: (e) => toast(errorMessage(e), 'error'),
    onSettled: refresh,
  });
  const list = data ?? [];
  const today = +sod(Date.now());
  const groups: [string, Task[]][] =
    tab === 'done'
      ? [['Completed', list]]
      : [
          ['Overdue', list.filter((t) => t.overdue)],
          ['Today', list.filter((t) => !t.overdue && t.due && +sod(t.due) === today)],
          ['Upcoming', list.filter((t) => !t.overdue && t.due && +sod(t.due) > today)],
          ['No due date', list.filter((t) => !t.due)],
        ];
  return (
    <>
      <PageHead title="Tasks" sub="Follow-ups, calls and reminders">
        <button className="btn primary" onClick={() => setForm(true)}>
          <Plus size={16} />
          New task
        </button>
      </PageHead>
      <div className="card">
        <div className="toolbar">
          <div className="seg">
            {(
              [
                ['open', 'Open'],
                ['done', 'Done'],
              ] as const
            ).map(([k, l]) => (
              <button key={k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>
                {l}
              </button>
            ))}
          </div>
          {user?.role === 'admin' && (
            <div className="seg">
              {(
                [
                  ['mine', 'Mine'],
                  ['all', 'Everyone'],
                ] as const
              ).map(([k, l]) => (
                <button key={k} className={scope === k ? 'on' : ''} onClick={() => setScope(k)}>
                  {l}
                </button>
              ))}
            </div>
          )}
        </div>
        {isLoading ? (
          <Skeleton />
        ) : !list.length ? (
          <EmptyState icon={ListChecks} title={tab === 'open' ? 'Nothing to do' : 'No completed tasks yet'} sub="Add a task to keep follow-ups from slipping." />
        ) : (
          groups
            .filter(([, l]) => l.length)
            .map(([name, items]) => (
              <div key={name}>
                <div className="chat-sec" style={name === 'Overdue' ? { color: 'var(--bad)' } : undefined}>
                  {name} · {items.length}
                </div>
                {items.map((t) => (
                  <div key={t.id} className="task-row">
                    <input type="checkbox" aria-label={`${t.done ? 'Reopen' : 'Complete'} ${t.title}`} checked={t.done} onChange={() => toggle.mutate(t)} style={{ width: 18, height: 18 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, textDecoration: t.done ? 'line-through' : 'none', opacity: t.done ? 0.55 : 1 }}>{t.title}</div>
                      <div style={{ fontSize: 12.5, color: 'var(--muted)', display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 2 }}>
                        {t.candidate && (
                          <Link to={'/candidates/' + t.candidate.id} style={{ color: 'var(--brand-text)' }}>
                            {t.candidate.name}
                          </Link>
                        )}
                        {t.job && <span>{t.job.title}</span>}
                        {scope === 'all' && t.assignee && <span>→ {t.assignee.name}</span>}
                        {t.notes && <span>{t.notes}</span>}
                      </div>
                    </div>
                    <span className={'badge ' + (t.priority === 'High' ? 'bad' : t.priority === 'Medium' ? 'warn' : '')}>{t.priority}</span>
                    {t.due && (
                      <span className={'badge ' + (t.overdue ? 'bad' : '')}>
                        <CalendarClock size={12} />
                        {shortDT(t.due)}
                      </span>
                    )}
                    <button
                      className="iconbtn"
                      style={{ width: 30, height: 30 }}
                      onClick={() => {
                        if (confirm('Delete this task?')) del.mutate(t);
                      }}
                      aria-label={`Delete task ${t.title}`}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            ))
        )}
      </div>
      {form && <TaskForm onClose={() => setForm(false)} />}
    </>
  );
}
