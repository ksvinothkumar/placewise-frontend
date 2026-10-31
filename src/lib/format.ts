// Ported from legacy client/src/format.js. Stage metadata is configurable server-side: setStages() mutates the shared objects in place.
export const money = (n?: number | null) => '₹' + (Math.round((n || 0) * 10) / 10).toLocaleString('en-IN') + 'L';
export const inr = (n?: number | null) => '₹' + Math.round(n || 0).toLocaleString('en-IN');
export const initials = (n?: string | null) =>
  String(n || '?')
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
export const fmtDT = (t: string | number | Date) =>
  new Date(t).toLocaleString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
export const fmtTime = (t: string | number | Date) => new Date(t).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
export const fmtDate = (d?: string | number | Date | null) =>
  d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
export const fmtLongDate = (d?: string | number | Date | null) =>
  d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) : '—';

export function rel(t: string | number | Date): string {
  const m = (Date.now() - new Date(t).getTime()) / 60000;
  if (m < 1) return 'just now';
  if (m < 60) return Math.floor(m) + 'm ago';
  if (m < 1440) return Math.floor(m / 60) + 'h ago';
  return Math.floor(m / 1440) + 'd ago';
}

export const STAGES: string[] = ['Sourced', 'Screening', 'Submitted', 'Interview', 'Offer', 'Placed', 'Rejected'];
const STAGE_KIND: Record<string, string> = {
  Sourced: 'start',
  Submitted: 'submit',
  Interview: 'interview',
  Offer: 'offer',
  Placed: 'placed',
  Rejected: 'rejected',
};
export const STAGE_COLOR: Record<string, string> = {
  Sourced: '#94a3b8',
  Screening: '#0ea5e9',
  Submitted: '#8b5cf6',
  Interview: '#f59e0b',
  Offer: '#4f46e5',
  Placed: '#10b981',
  Rejected: '#ef4444',
};
export const STAGE_PROB: Record<string, number> = {
  Sourced: 0.05,
  Screening: 0.1,
  Submitted: 0.2,
  Interview: 0.35,
  Offer: 0.7,
  Placed: 1,
  Rejected: 0,
};
export const CITIES = [
  'Bengaluru',
  'Hyderabad',
  'Chennai',
  'Mumbai',
  'Pune',
  'Delhi',
  'Gurugram',
  'Noida',
  'Kolkata',
  'Ahmedabad',
  'Kochi',
  'Coimbatore',
  'Remote',
];

export const scoreTone = (s: number): 'good' | 'warn' | 'bad' => (s >= 75 ? 'good' : s >= 50 ? 'warn' : 'bad');
const PALETTE = ['#4f46e5', '#0891b2', '#7c3aed', '#db2777', '#ea580c', '#059669', '#2563eb', '#9333ea'];
export const colorFor = (n?: string | null) => PALETTE[[...String(n)].reduce((a, c) => a + c.charCodeAt(0), 0) % PALETTE.length] as string;

let ROLE_NAMES: Record<string, string> = { admin: 'Admin', hr: 'HR', finance: 'Finance', client: 'Client' };
export const setRoleNames = (m?: Record<string, string> | null) => {
  if (m) ROLE_NAMES = m;
};
export const roleLabel = (r?: string | null) => (r && ROLE_NAMES[r]) || r || '';

export interface StageDef {
  name: string;
  color: string;
  prob: number;
  kind: string;
}
export function setStages(list?: StageDef[] | null) {
  if (!list?.length) return;
  STAGES.length = 0;
  for (const o of [STAGE_COLOR, STAGE_PROB, STAGE_KIND] as Record<string, unknown>[]) for (const k of Object.keys(o)) delete o[k];
  list.forEach((x) => {
    STAGES.push(x.name);
    STAGE_COLOR[x.name] = x.color;
    STAGE_PROB[x.name] = x.prob;
    STAGE_KIND[x.name] = x.kind;
  });
}
export const stageKind = (n: string) => STAGE_KIND[n] || 'custom';
export const isTerminalStage = (n: string) => ['placed', 'rejected'].includes(stageKind(n));
export const stageColor = (n: string) => STAGE_COLOR[n] || '#64748b';

export const waLink = (phone?: string | null, text = ''): string | null => {
  let d = String(phone || '').replace(/\D/g, '');
  if (d.length === 11 && d.startsWith('0')) d = d.slice(1);
  if (d.length === 10) d = '91' + d;
  return d.length >= 11 ? `https://wa.me/${d}?text=${encodeURIComponent(text)}` : null;
};
