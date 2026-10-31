import type { DayStatus } from '@/api/endpoints/attendance';

export const hm = (d: string | number | Date) => new Date(d).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
export const dur = (m?: number | null) => (m == null ? '—' : `${Math.floor(m / 60)}h ${String(m % 60).padStart(2, '0')}m`);
/** Clock face for the running timer, from whole seconds. */
export const clock = (s: number) => [Math.floor(s / 3600), Math.floor(s / 60) % 60, s % 60].map((n) => String(n).padStart(2, '0')).join(':');

/** Calendar arithmetic on YYYY-MM-DD strings, in UTC so DST never shifts a day. */
export const addDays = (ds: string, n: number) => {
  const d = new Date(ds + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};
export const dowOf = (ds: string) => new Date(ds + 'T00:00:00Z').getUTCDay();
/** `YYYY-MM` shifted by `n` months. */
export const shiftMonth = (m: string, n: number) => {
  const [y, mo] = m.split('-').map(Number) as [number, number];
  return new Date(Date.UTC(y, mo - 1 + n, 1)).toISOString().slice(0, 7);
};

/** Working days a leave request would consume: weekly offs and holidays are free, a single half day is 0.5. */
export function leaveDays(from: string, to: string, weeklyOff: readonly number[], holidays: readonly string[], halfDay: boolean): number {
  if (!from || !to || to < from) return 0;
  const off = new Set(weeklyOff);
  const hol = new Set(holidays);
  let days = 0;
  for (let d = from; d <= to; d = addDays(d, 1)) if (!off.has(dowOf(d)) && !hol.has(d)) days++;
  return halfDay && from === to && days ? 0.5 : days;
}

export const CELL: Record<DayStatus, [string, string]> = {
  present: ['var(--good-soft)', 'var(--good)'],
  leave: ['var(--info-soft)', 'var(--info)'],
  holiday: ['var(--brand-soft)', 'var(--brand-text)'],
  off: ['var(--surface2)', 'var(--muted)'],
  absent: ['var(--bad-soft)', 'var(--bad)'],
  future: ['transparent', 'var(--muted)'],
};
export const LEAVE_TONE: Record<string, string> = { pending: 'warn', approved: 'good', rejected: 'bad', cancelled: '' };
