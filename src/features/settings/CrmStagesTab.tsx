import { ArrowDown, ArrowUp, Loader2, Plus, Save, Trash2, Workflow } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { settingsApi, type CrmStageGroup } from '@/api/endpoints/settings';
import { errorMessage, isApiError } from '@/api/errors';
import { useApiMutation } from '@/api/hooks';
import { queryKeys } from '@/api/queryKeys';
import { Field } from '@/components/ui/Layout';
import { Modal } from '@/components/ui/Modal';
import { Skeleton } from '@/components/ui/Skeleton';
import { toast } from '@/stores/ui.store';
import { settingsKeys, useSettingsView } from './hooks';
import { CRM_KIND_LABEL, canMoveCrm, insertBeforeClosing, move, newUid, sameRows, toCrmPayload, toCrmRows, validateStageRows, type CrmRow } from './stageRules';

const iconBtn = { width: 28, height: 28 } as const;
const GROUPS: [CrmStageGroup, string][] = [['company', 'Companies'], ['contact', 'Contacts']];

export function CrmStagesTab() {
  const { data } = useSettingsView();
  const [which, setWhich] = useState<CrmStageGroup>('company');
  const [draft, setDraft] = useState<CrmRow[] | null>(null);
  const [ask, setAsk] = useState<{ message: string; stageKey?: string } | null>(null);
  const [dest, setDest] = useState('');
  useEffect(() => setDraft(null), [which]);

  const base = useMemo(() => (data ? toCrmRows(which === 'company' ? data.crmStages : data.contactStages) : null), [data, which]);
  const rows = draft ?? base;

  const save = useApiMutation((vars: { rows: CrmRow[]; moves?: Record<string, string> }) => settingsApi.saveCrmStages(which, toCrmPayload(vars.rows), vars.moves), {
    invalidate: [settingsKeys.view, queryKeys.leads.all, ['api']],
    onSuccess: () => {
      toast('Stages saved');
      setDraft(null);
      setAsk(null);
    },
    onError: (e, vars) => {
      if (isApiError(e) && e.status === 409) {
        setAsk({ message: e.message, stageKey: (e.details as { stage?: string } | undefined)?.stage });
        setDest(vars.rows.find((x) => x.key)?.name ?? '');
      } else toast(errorMessage(e), 'error');
    },
  });

  if (!rows || !base) return <div className="card"><Skeleton rows={5} /></div>;
  const dirty = !sameRows(rows, base);
  const problem = validateStageRows(rows);
  const edit = (fn: (r: CrmRow[]) => CrmRow[]) => setDraft(fn(rows));
  const set = (i: number, p: Partial<CrmRow>) => edit((r) => r.map((x, j) => (j === i ? { ...x, ...p } : x)));

  return (
    <div className="card">
      <div className="card-h">
        <Workflow size={17} color="var(--brand)" />
        <h3>CRM stages</h3>
        <div className="seg" style={{ marginLeft: 'auto' }}>
          {GROUPS.map(([k, l]) => (
            <button key={k} type="button" className={which === k ? 'on' : ''} aria-pressed={which === k} onClick={() => setWhich(k)}>{l}</button>
          ))}
        </div>
      </div>
      <div className="card-b">
        <div role="list" aria-label="CRM stages" style={{ display: 'grid', gap: 8 }}>
          {rows.map((x, i) => (
            <div key={x.uid} role="listitem" style={{ display: 'grid', gridTemplateColumns: '38px 1fr 150px 92px', gap: 10, alignItems: 'center', padding: '8px 10px', border: '1px solid var(--line)', borderRadius: 10 }}>
              <input type="color" value={x.color} onChange={(e) => set(i, { color: e.target.value })} style={{ width: 34, height: 34, border: 0, background: 'none', padding: 0 }} aria-label={`Colour for stage ${i + 1}`} />
              <input className="input" value={x.name} maxLength={30} aria-label={`Name of stage ${i + 1}`} onChange={(e) => set(i, { name: e.target.value })} />
              <span style={{ fontSize: 12.5, color: 'var(--text2)' }}>{CRM_KIND_LABEL[x.kind]}</span>
              <span style={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
                {x.kind === 'custom' && (
                  <>
                    <button type="button" className="iconbtn" style={iconBtn} disabled={!canMoveCrm(rows, i, -1)} onClick={() => edit((r) => move(r, i, -1, canMoveCrm))} aria-label={`Move ${x.name || 'stage'} up`}><ArrowUp size={13} /></button>
                    <button type="button" className="iconbtn" style={iconBtn} disabled={!canMoveCrm(rows, i, 1)} onClick={() => edit((r) => move(r, i, 1, canMoveCrm))} aria-label={`Move ${x.name || 'stage'} down`}><ArrowDown size={13} /></button>
                    <button type="button" className="iconbtn" style={iconBtn} onClick={() => edit((r) => r.filter((_, j) => j !== i))} aria-label={`Delete ${x.name || 'stage'}`}><Trash2 size={13} /></button>
                  </>
                )}
              </span>
            </div>
          ))}
        </div>
        {dirty && problem && <div className="banner bad" role="alert" style={{ marginTop: 12 }}>{problem}</div>}
        <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
          <button type="button" className="btn" onClick={() => edit((r) => insertBeforeClosing(r, { uid: newUid(), name: '', color: '#64748b', kind: 'custom' }))}><Plus size={15} />Add stage</button>
          <span style={{ flex: 1 }} />
          {dirty && <button type="button" className="btn" onClick={() => setDraft(null)}>Discard</button>}
          <button type="button" className="btn primary" disabled={!dirty || save.isPending || !!problem} onClick={() => save.mutate({ rows })}>
            {save.isPending ? <Loader2 size={15} className="spin" /> : <Save size={15} />}Save stages
          </button>
        </div>
        {ask && (
          <Modal
            title="Move records first"
            sub={ask.message}
            onClose={() => setAsk(null)}
            footer={
              <>
                <button type="button" className="btn" onClick={() => setAsk(null)}>Cancel</button>
                <button type="button" className="btn primary" disabled={save.isPending || !ask.stageKey} onClick={() => ask.stageKey && save.mutate({ rows, moves: { [ask.stageKey]: dest } })}>Move and delete</button>
              </>
            }
          >
            <Field label="Move them to">
              <select className="select" value={dest} onChange={(e) => setDest(e.target.value)}>
                {rows.filter((x) => x.key).map((x) => (
                  <option key={x.uid}>{x.name}</option>
                ))}
              </select>
            </Field>
          </Modal>
        )}
      </div>
    </div>
  );
}
