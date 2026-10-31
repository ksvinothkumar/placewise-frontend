// Calendar helpers shared by interviews, tasks and CRM forms. All local-time, matching the legacy client.
const p2 = (n: number) => String(n).padStart(2, '0');

/** Value for <input type="datetime-local">. */
export const toLocalInput = (d: string | number | Date | null | undefined): string => {
  if (!d) return '';
  const x = new Date(d);
  return `${x.getFullYear()}-${p2(x.getMonth() + 1)}-${p2(x.getDate())}T${p2(x.getHours())}:${p2(x.getMinutes())}`;
};
/** Start of day. */
export const sod = (d: string | number | Date): Date => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
};
export const addDays = (d: string | number | Date, n: number): Date => {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
};
/** yyyy-mm-dd in local time (calendar bucket key). */
export const dayKey = (d: string | number | Date): string => {
  const x = new Date(d);
  return `${x.getFullYear()}-${p2(x.getMonth() + 1)}-${p2(x.getDate())}`;
};
export const monday = (d: string | number | Date): Date => addDays(sod(d), -((new Date(d).getDay() + 6) % 7));
export const longDay = (d: string | number | Date): string =>
  new Date(d).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
export const shortDT = (d: string | number | Date): string =>
  new Date(d).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
/** ISO string from a datetime-local value, '' when empty (legacy API clears a date with ''). */
export const fromLocalInput = (v: string): string => (v ? new Date(v).toISOString() : '');
