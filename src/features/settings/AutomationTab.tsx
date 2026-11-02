import { Loader2, Plus, Save, Trash2, Zap } from 'lucide-react';
import { useMemo, useState } from 'react';
import { settingsApi, type AutomationSettings, type AutomationTask, type StageAutomation } from '@/api/endpoints/settings';
import { errorMessage } from '@/api/errors';
import { useApiMutation } from '@/api/hooks';
import { Skeleton } from '@/components/ui/Skeleton';
import { toast } from '@/stores/ui.store';
import { settingsKeys, useSettingsView } from './hooks';

const EMPTY: StageAutomation = { tasks: [], email: '', moveTo: '', moveAfterDays: 0, nudgeAfterDays: 0 };
const EMAILS: Array<[StageAutomation['email'], string]> = [
  ['', 'Do not send an email'],
  ['outreach', 'Outreach to the candidate'],
  ['submission', 'Submission to the client contact'],
  ['offer', 'Offer discussion to the candidate'],
  ['reject', 'Rejection note to the candidate'],
];
const num = (v: string) => Math.max(0, Math.floor(Number(v) || 0));
const same = (a: AutomationSettings, b: AutomationSettings) => JSON.stringify(a) === JSON.stringify(b);

/** Pipeline automation: what happens by itself when a candidate enters each stage. */
export function AutomationTab() {
  const { data } = useSettingsView();
  const base = useMemo<AutomationSettings | null>(() => (data?.automation ? data.automation : null), [data]);
  const [draft, setDraft] = useState<AutomationSettings | null>(null);
  const cfg = draft ?? base;

  const save = useApiMutation((a: AutomationSettings) => settingsApi.saveAutomation(a), {
    invalidate: [settingsKeys.view],
    onSuccess: () => {
      toast('Automation saved');
      setDraft(null);
    },
    onError: (e) => toast(errorMessage(e), 'error'),
  });

  if (!data || !cfg || !base) return <div className="card"><Skeleton rows={6} /></div>;

  const stages = data.stages;
  const edit = (fn: (c: AutomationSettings) => AutomationSettings) => setDraft(fn(cfg));
  const rule = (key: string): StageAutomation => cfg.rules[key] ?? EMPTY;
  const setRule = (key: string, patch: Partial<StageAutomation>) => edit((c) => ({ ...c, rules: { ...c.rules, [key]: { ...rule(key), ...patch } } }));
  const setTask = (key: string, i: number, patch: Partial<AutomationTask>) =>
    setRule(key, { tasks: rule(key).tasks.map((t, j) => (j === i ? { ...t, ...patch } : t)) });
  const dirty = !same(cfg, base);

  return (
    <div className="card">
      <div className="card-h">
        <Zap size={17} color="var(--brand)" />
        <h3>Pipeline automation</h3>
        <small>when a candidate is added to a job or enters a stage, the pipeline can create tasks, send an email, advance them and nudge you when they go stale.</small>
      </div>
      <div className="card-b">
        <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontWeight: 600 }}>
          <input type="checkbox" checked={cfg.enabled} onChange={(e) => edit((c) => ({ ...c, enabled: e.target.checked }))} />
          Automation is {cfg.enabled ? 'on' : 'off'}
        </label>
        <div style={{ display: 'grid', gap: 12, marginTop: 14, opacity: cfg.enabled ? 1 : 0.55 }}>
          {stages.map((s, i) => {
            const r = rule(s.key);
            const final = s.kind === 'placed' || s.kind === 'rejected';
            const later = stages.slice(i + 1).filter((x) => x.kind !== 'placed' && x.kind !== 'rejected');
            return (
              <section key={s.key} aria-label={`${s.name} automation`} style={{ border: '1px solid var(--line)', borderRadius: 10, padding: 12, background: 'var(--surface)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <span style={{ width: 10, height: 10, borderRadius: 99, background: s.color }} />
                  <strong>{s.name}</strong>
                  <small style={{ color: 'var(--muted)' }}>when a candidate enters this stage</small>
                </div>
                {final ? (
                  <div style={{ color: 'var(--muted)', fontSize: 12.5 }}>
                    Placing and rejecting are always a person's decision. You can still create follow-up tasks or send an email here.
                  </div>
                ) : null}
                <div style={{ display: 'grid', gap: 8 }}>
                  {r.tasks.map((t, ti) => (
                    <div key={ti} style={{ display: 'grid', gridTemplateColumns: 'minmax(180px,1fr) 90px 110px 32px', gap: 8, alignItems: 'center' }}>
                      <input className="input" value={t.title} maxLength={120} placeholder="Task, e.g. Call {candidate}" aria-label={`Task ${ti + 1} for ${s.name}`} onChange={(e) => setTask(s.key, ti, { title: e.target.value })} />
                      <label style={{ fontSize: 12.5, color: 'var(--text2)', display: 'flex', gap: 4, alignItems: 'center' }}>
                        due in
                        <input className="input" type="number" min="0" max="90" value={t.dueDays} style={{ width: 54, padding: '5px 6px' }} aria-label={`Days until task ${ti + 1} for ${s.name} is due`} onChange={(e) => setTask(s.key, ti, { dueDays: num(e.target.value) })} />d
                      </label>
                      <select className="input" value={t.priority} aria-label={`Priority of task ${ti + 1} for ${s.name}`} onChange={(e) => setTask(s.key, ti, { priority: e.target.value as AutomationTask['priority'] })}>
                        <option>High</option>
                        <option>Medium</option>
                        <option>Low</option>
                      </select>
                      <button type="button" className="iconbtn" aria-label={`Remove task ${ti + 1} for ${s.name}`} onClick={() => setRule(s.key, { tasks: r.tasks.filter((_, j) => j !== ti) })}><Trash2 size={13} /></button>
                    </div>
                  ))}
                  {r.tasks.length < 5 && (
                    <button type="button" className="btn ghost" style={{ justifySelf: 'start' }} onClick={() => setRule(s.key, { tasks: [...r.tasks, { title: '', dueDays: 1, priority: 'Medium' }] })}>
                      <Plus size={14} />Add task
                    </button>
                  )}
                  <label style={{ display: 'grid', gap: 4, fontSize: 12.5, color: 'var(--text2)' }}>
                    Email
                    <select className="input" value={r.email} aria-label={`Email for ${s.name}`} onChange={(e) => setRule(s.key, { email: e.target.value as StageAutomation['email'] })}>
                      {EMAILS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                    </select>
                  </label>
                  {!final && (
                    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', fontSize: 12.5, color: 'var(--text2)' }}>
                      <label style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                        Move on to
                        <select className="input" value={r.moveTo} aria-label={`Move on from ${s.name} to`} onChange={(e) => setRule(s.key, { moveTo: e.target.value })}>
                          <option value="">Stay here</option>
                          {later.map((x) => <option key={x.key} value={x.key}>{x.name}</option>)}
                        </select>
                      </label>
                      {r.moveTo && (
                        <label style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                          after
                          <input className="input" type="number" min="0" max="90" value={r.moveAfterDays} style={{ width: 60, padding: '5px 6px' }} aria-label={`Days in ${s.name} before moving on`} onChange={(e) => setRule(s.key, { moveAfterDays: num(e.target.value) })} />
                          days (0 = straight away)
                        </label>
                      )}
                      <label style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                        Remind the owner after
                        <input className="input" type="number" min="0" max="90" value={r.nudgeAfterDays} style={{ width: 60, padding: '5px 6px' }} aria-label={`Days in ${s.name} before a reminder`} onChange={(e) => setRule(s.key, { nudgeAfterDays: num(e.target.value) })} />
                        days (0 = never)
                      </label>
                    </div>
                  )}
                </div>
              </section>
            );
          })}
        </div>
        <div style={{ display: 'flex', gap: 10, marginTop: 16, flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ flex: 1 }} />
          {dirty && <button type="button" className="btn" onClick={() => setDraft(null)}>Discard</button>}
          <button type="button" className="btn primary" disabled={!dirty || save.isPending} onClick={() => save.mutate(cfg)}>
            {save.isPending ? <Loader2 size={15} className="spin" /> : <Save size={15} />}Save automation
          </button>
        </div>
        <div style={{ color: 'var(--muted)', fontSize: 12.5, marginTop: 12 }}>
          Use {'{candidate}'}, {'{job}'} and {'{client}'} in task titles. Tasks go to the person who added the candidate. Emails are only sent when mail (SMTP) is configured. Reminders and timed moves are checked every 10 minutes.
        </div>
      </div>
    </div>
  );
}
