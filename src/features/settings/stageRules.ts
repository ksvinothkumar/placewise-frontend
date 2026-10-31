import type { CrmStageDef, CrmStageInput, StageDef, StageInput } from '@/api/endpoints/settings';

/** Editor row. `prob` is shown as a percent (0..100) while editing and sent as a 0..1 fraction. `uid` is a stable React key for rows that have no server key yet. */
export interface StageRow {
  uid: string;
  key?: string;
  name: string;
  color: string;
  kind: string;
  prob: number | string;
}
export type CrmRow = Omit<StageRow, 'prob'>;

let seq = 0;
export const newUid = () => `n${++seq}`;

export const KIND_LABEL: Record<string, string> = {
  start: 'Entry stage',
  submit: 'Shown to clients',
  interview: 'Interview',
  offer: 'Offer',
  placed: 'Placement (creates invoice)',
  rejected: 'Rejected',
  custom: 'Custom',
};
export const CRM_KIND_LABEL: Record<string, string> = { start: 'Entry stage', won: 'Won (client)', lost: 'Lost', custom: 'Custom' };

export const DEFAULT_STAGES: readonly (readonly [string, string, string, number])[] = [
  ['Sourced', '#94a3b8', 'start', 5],
  ['Screening', '#0ea5e9', 'custom', 10],
  ['Submitted', '#8b5cf6', 'submit', 20],
  ['Interview', '#f59e0b', 'interview', 35],
  ['Offer', '#4f46e5', 'offer', 70],
  ['Placed', '#10b981', 'placed', 100],
  ['Rejected', '#ef4444', 'rejected', 0],
];

export const toRows = (stages: readonly StageDef[]): StageRow[] =>
  stages.map((s) => ({ uid: s.key, key: s.key, name: s.name, color: s.color, kind: s.kind, prob: Math.round((s.prob ?? 0) * 100) }));
export const toCrmRows = (stages: readonly CrmStageDef[]): CrmRow[] =>
  stages.map((s) => ({ uid: s.key, key: s.key, name: s.name, color: s.color, kind: s.kind }));

/** Rows as the backend expects them. */
export const toPayload = (rows: readonly StageRow[]): StageInput[] =>
  rows.map(({ key, name, color, kind, prob }) => ({ ...(key ? { key } : {}), name: name.trim(), color, kind, prob: (+prob || 0) / 100 }));
export const toCrmPayload = (rows: readonly CrmRow[]): CrmStageInput[] =>
  rows.map(({ key, name, color, kind }) => ({ ...(key ? { key } : {}), name: name.trim(), color, kind }));

/** Compare ignoring the client-only uid. */
export const sameRows = (a: readonly (StageRow | CrmRow)[], b: readonly (StageRow | CrmRow)[]) =>
  JSON.stringify(a.map(({ uid: _u, ...r }) => r)) === JSON.stringify(b.map(({ uid: _u, ...r }) => r));

const FIXED = ['start', 'placed', 'rejected'];

/** Only custom stages move, only between the fixed Entry stage at the top and the Placed/Rejected pair at the bottom. */
export function canMove(rows: readonly StageRow[], i: number, d: -1 | 1): boolean {
  const k = i + d;
  const target = rows[k];
  return rows[i]?.kind === 'custom' && k > 0 && k < rows.length - 2 && !!target && !FIXED.includes(target.kind);
}
export function move<T extends { kind: string }>(rows: readonly T[], i: number, d: -1 | 1, allowed: (rows: readonly T[], i: number, d: -1 | 1) => boolean): T[] {
  if (!allowed(rows, i, d)) return [...rows];
  const a = [...rows];
  [a[i], a[i + d]] = [a[i + d]!, a[i]!];
  return a;
}
export const canMoveCrm = (rows: readonly CrmRow[], i: number, d: -1 | 1) => rows[i]?.kind === 'custom' && rows[i + d]?.kind === 'custom';

/** New custom stages go just before the closing pair (Placed, Rejected / Won, Lost). */
export function insertBeforeClosing<T>(rows: readonly T[], row: T): T[] {
  const a = [...rows];
  a.splice(Math.max(a.length - 2, 0), 0, row);
  return a;
}

/** First problem that would make the save fail or surprise the user, or null. */
export function validateStageRows(rows: readonly { name: string; prob?: number | string }[]): string | null {
  const seen = new Set<string>();
  for (const r of rows) {
    const name = r.name.trim();
    if (!name) return 'Every stage needs a name.';
    const k = name.toLowerCase();
    if (seen.has(k)) return `"${name}" is used twice. Stage names must be unique.`;
    seen.add(k);
    if (r.prob !== undefined) {
      const p = Number(r.prob);
      if (r.prob === '' || !Number.isFinite(p) || p < 0 || p > 100) return `"${name}": win chance must be a number from 0 to 100.`;
    }
  }
  return null;
}
