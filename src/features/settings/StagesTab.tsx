import { ArrowDown, ArrowUp, Loader2, Plus, RotateCcw, Save, Trash2, Workflow } from 'lucide-react';
import { useMemo, useState } from 'react';
import { settingsApi, type PipelineDef, type StageInput } from '@/api/endpoints/settings';
import { errorMessage, isApiError } from '@/api/errors';
import { useApiMutation } from '@/api/hooks';
import { Modal } from '@/components/ui/Modal';
import { Field } from '@/components/ui/Layout';
import { Skeleton } from '@/components/ui/Skeleton';
import { useSessionStore } from '@/stores/session.store';
import { toast } from '@/stores/ui.store';
import { STAGE_INVALIDATIONS, useSettingsView, useStageUsage } from './hooks';
import {
  DEFAULT_STAGES,
  KIND_LABEL,
  canMove,
  insertBeforeClosing,
  move,
  newUid,
  sameRows,
  toPayload,
  toRows,
  validateStageRows,
  type StageRow,
} from './stageRules';

const iconBtn = { width: 28, height: 28 } as const;

export function StagesTab() {
  const { data } = useSettingsView();
  const usage = useStageUsage();
  const refreshMe = useSessionStore((s) => s.refreshMe);
  const views = useMemo<PipelineDef[]>(
    () => (data ? (data.pipelines ?? [{ id: 'default', name: 'Standard hiring', stages: data.stages }]) : []),
    [data],
  );
  const [activeId, setActiveId] = useState('default');
  const active = (views.find((p) => p.id === activeId) ?? views[0]) as PipelineDef;
  const defaultName = views[0]?.name ?? 'Standard hiring';
  const isDefault = !active || active.id === 'default';
  const base = useMemo(() => (active ? toRows(active.stages) : null), [active]);
  const [draft, setDraft] = useState<StageRow[] | null>(null);
  const [nameDraft, setNameDraft] = useState<string | null>(null);
  const name = nameDraft ?? active?.name ?? '';
  const switchTo = (id: string) => {
    setActiveId(id);
    setDraft(null);
    setNameDraft(null);
    setAsk(null);
  };
  const [ask, setAsk] = useState<{ message: string; stageKey?: string } | null>(null);
  const [dest, setDest] = useState('');

  const rows = draft ?? base;
  const others = views.slice(1);
  const asInput = (p: PipelineDef) => ({ id: p.id, name: p.name, stages: p.stages as StageInput[] });
  const save = useApiMutation(
    async (vars: { rows: StageRow[]; moves?: Record<string, string> }) => {
      if (isDefault) {
        await settingsApi.saveStages(toPayload(vars.rows), vars.moves);
        if (name.trim() !== active.name) await settingsApi.savePipelines(others.map(asInput), { defaultName: name.trim() });
        return;
      }
      await settingsApi.savePipelines(
        others.map((p) => (p.id === active.id ? { id: p.id, name: name.trim(), stages: toPayload(vars.rows) } : asInput(p))),
        { defaultName: defaultName, moves: vars.moves },
      );
    },
    {
      invalidate: [...STAGE_INVALIDATIONS],
      onSuccess: async () => {
        toast('Pipeline stages saved');
        setDraft(null);
        setNameDraft(null);
        setAsk(null);
        await refreshMe().catch(() => undefined); // stage list lives in the session too
      },
      onError: (e, vars) => {
        if (isApiError(e) && e.status === 409 && e.code === 'STAGE_IN_USE') {
          const stageKey = (e.details as { stage?: string } | undefined)?.stage;
          setAsk({ message: e.message, stageKey });
          setDest((vars.rows.find((x) => x.key && x.kind === 'custom') ?? vars.rows.find((x) => x.key))?.name ?? '');
        } else toast(errorMessage(e), 'error');
      },
    },
  );

  const createPipeline = useApiMutation(
    (title: string) =>
      settingsApi.savePipelines(
        [
          ...others.map(asInput),
          { name: title, stages: DEFAULT_STAGES.map(([n, color, kind, prob]) => ({ name: n, color, kind, prob: prob / 100 })) },
        ],
        { defaultName: defaultName },
      ),
    {
      invalidate: [...STAGE_INVALIDATIONS],
      onSuccess: async (r) => {
        toast('Pipeline created');
        switchTo(r.pipelines[r.pipelines.length - 1]?.id ?? 'default');
        await refreshMe().catch(() => undefined);
      },
      onError: (e) => toast(errorMessage(e), 'error'),
    },
  );
  const removePipeline = useApiMutation(
    () => settingsApi.savePipelines(others.filter((p) => p.id !== active.id).map(asInput), { defaultName: defaultName }),
    {
      invalidate: [...STAGE_INVALIDATIONS],
      onSuccess: async () => {
        toast('Pipeline deleted');
        switchTo('default');
        await refreshMe().catch(() => undefined);
      },
      onError: (e) => toast(errorMessage(e), 'error'),
    },
  );

  if (!rows || !base || !active)
    return (
      <div className="card">
        <Skeleton rows={6} />
      </div>
    );

  const dirty = !sameRows(rows, base) || name.trim() !== active.name;
  const problem = validateStageRows(rows) || (name.trim() ? '' : 'Give the pipeline a name');
  const edit = (fn: (r: StageRow[]) => StageRow[]) => setDraft(fn(rows));
  const set = (i: number, patch: Partial<StageRow>) => edit((r) => r.map((x, j) => (j === i ? { ...x, ...patch } : x)));
  const add = () => edit((r) => insertBeforeClosing(r, { uid: newUid(), name: '', color: '#64748b', kind: 'custom', prob: 10 }));
  const reset = () =>
    setDraft(
      DEFAULT_STAGES.map(([name, color, kind, prob]) => {
        const cur = (kind !== 'custom' && base.find((x) => x.kind === kind)) || base.find((x) => x.name === name);
        return { uid: cur?.uid ?? newUid(), key: cur?.key, name, color, kind, prob };
      }),
    );
  const used = (x: StageRow) =>
    usage.data?.[x.name] != null ? `${usage.data[x.name]} candidate${usage.data[x.name] === 1 ? '' : 's'}` : x.key ? '0 candidates' : 'new';

  return (
    <div className="card">
      <div className="card-h">
        <Workflow size={17} color="var(--brand)" />
        <h3>Pipeline stages</h3>
        <small>
          rename, recolour, reorder and add stages. Every stage has a type so reports, invoices and the client portal keep working.
        </small>
      </div>
      <div className="card-b">
        <div
          role="tablist"
          aria-label="Hiring pipelines"
          style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginBottom: 14 }}
        >
          {views.map((p) => (
            <button
              key={p.id}
              type="button"
              role="tab"
              aria-selected={p.id === active.id}
              className={'btn' + (p.id === active.id ? ' primary' : '')}
              onClick={() => switchTo(p.id)}
            >
              {p.name}
            </button>
          ))}
          <button
            type="button"
            className="btn ghost"
            disabled={createPipeline.isPending}
            onClick={() => {
              const title = window.prompt('Name of the new pipeline (for example Contract staffing)')?.trim();
              if (title) createPipeline.mutate(title);
            }}
          >
            <Plus size={15} />
            New pipeline
          </button>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 14, flexWrap: 'wrap' }}>
          <label style={{ fontSize: 12.5, color: 'var(--text2)' }}>
            Pipeline name
            <input
              className="input"
              aria-label="Pipeline name"
              maxLength={40}
              style={{ display: 'block', width: 260 }}
              value={name}
              onChange={(e) => setNameDraft(e.target.value)}
            />
          </label>
          {!isDefault && (
            <button
              type="button"
              className="btn ghost"
              style={{ alignSelf: 'flex-end' }}
              disabled={removePipeline.isPending}
              onClick={() => confirm(`Delete the "${active.name}" pipeline? Jobs must be moved off it first.`) && removePipeline.mutate()}
            >
              <Trash2 size={15} />
              Delete pipeline
            </button>
          )}
          {isDefault && (
            <span style={{ color: 'var(--muted)', fontSize: 12.5, alignSelf: 'flex-end' }}>
              Jobs without a pipeline of their own use this one.
            </span>
          )}
        </div>
        <div role="list" aria-label="Pipeline stages" style={{ display: 'grid', gap: 8, overflowX: 'auto' }}>
          {rows.map((x, i) => (
            <div
              key={x.uid}
              role="listitem"
              style={{
                display: 'grid',
                gridTemplateColumns: '38px minmax(130px,1fr) 160px 104px 110px 92px',
                minWidth: 720,
                gap: 10,
                alignItems: 'center',
                padding: '8px 10px',
                border: '1px solid var(--line)',
                borderRadius: 10,
                background: 'var(--surface)',
              }}
            >
              <input
                type="color"
                value={x.color}
                onChange={(e) => set(i, { color: e.target.value })}
                style={{ width: 34, height: 34, border: 0, background: 'none', padding: 0, cursor: 'pointer' }}
                aria-label={`Colour for stage ${i + 1}`}
              />
              <input
                className="input"
                value={x.name}
                placeholder="Stage name"
                maxLength={30}
                aria-label={`Name of stage ${i + 1}`}
                onChange={(e) => set(i, { name: e.target.value })}
              />
              <span style={{ fontSize: 12.5, color: 'var(--text2)' }}>{KIND_LABEL[x.kind]}</span>
              <label
                style={{ display: 'flex', gap: 5, alignItems: 'center', fontSize: 12.5, color: 'var(--text2)' }}
                title="Chance a candidate in this stage ends up placed. Used for the revenue forecast."
              >
                <input
                  className="input"
                  type="number"
                  min="0"
                  max="100"
                  value={x.prob}
                  style={{ width: 62, padding: '5px 8px' }}
                  aria-label={`Win chance for ${x.name || `stage ${i + 1}`}`}
                  onChange={(e) => set(i, { prob: e.target.value })}
                />
                % win
              </label>
              <span style={{ fontSize: 12.5, color: 'var(--muted)' }}>{used(x)}</span>
              <span style={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
                {x.kind === 'custom' && (
                  <>
                    <button
                      type="button"
                      className="iconbtn"
                      style={iconBtn}
                      disabled={!canMove(rows, i, -1)}
                      onClick={() => edit((r) => move(r, i, -1, canMove))}
                      aria-label={`Move ${x.name || 'stage'} up`}
                    >
                      <ArrowUp size={13} />
                    </button>
                    <button
                      type="button"
                      className="iconbtn"
                      style={iconBtn}
                      disabled={!canMove(rows, i, 1)}
                      onClick={() => edit((r) => move(r, i, 1, canMove))}
                      aria-label={`Move ${x.name || 'stage'} down`}
                    >
                      <ArrowDown size={13} />
                    </button>
                    <button
                      type="button"
                      className="iconbtn"
                      style={iconBtn}
                      onClick={() => edit((r) => r.filter((_, j) => j !== i))}
                      aria-label={`Delete ${x.name || 'stage'}`}
                    >
                      <Trash2 size={13} />
                    </button>
                  </>
                )}
              </span>
            </div>
          ))}
        </div>
        {dirty && problem && (
          <div className="banner bad" role="alert" style={{ marginTop: 12 }}>
            {problem}
          </div>
        )}
        <div style={{ display: 'flex', gap: 10, marginTop: 16, flexWrap: 'wrap', alignItems: 'center' }}>
          <button type="button" className="btn" onClick={add}>
            <Plus size={15} />
            Add stage
          </button>
          <button type="button" className="btn ghost" onClick={reset}>
            <RotateCcw size={15} />
            Reset to defaults
          </button>
          <span style={{ flex: 1 }} />
          {dirty && (
            <button
              type="button"
              className="btn"
              onClick={() => {
                setDraft(null);
                setNameDraft(null);
              }}
            >
              Discard
            </button>
          )}
          <button
            type="button"
            className="btn primary"
            disabled={!dirty || save.isPending || !!problem}
            onClick={() => save.mutate({ rows })}
          >
            {save.isPending ? <Loader2 size={15} className="spin" /> : <Save size={15} />}Save stages
          </button>
        </div>
        <div style={{ color: 'var(--muted)', fontSize: 12.5, marginTop: 12 }}>
          Renaming a stage updates every candidate and their history automatically. The Entry, Submit, Interview, Offer, Placed and Rejected
          stages can be renamed and recoloured but not removed.
        </div>
        {ask && (
          <Modal
            title="Move candidates first"
            sub={ask.message}
            onClose={() => setAsk(null)}
            footer={
              <>
                <button type="button" className="btn" onClick={() => setAsk(null)}>
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn primary"
                  disabled={save.isPending || !ask.stageKey}
                  onClick={() => ask.stageKey && save.mutate({ rows, moves: { [ask.stageKey]: dest } })}
                >
                  {save.isPending && <Loader2 size={15} className="spin" />}Move and delete
                </button>
              </>
            }
          >
            <Field label="Move them to">
              <select className="select" value={dest} onChange={(e) => setDest(e.target.value)}>
                {rows
                  .filter((x) => x.key)
                  .map((x) => (
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
