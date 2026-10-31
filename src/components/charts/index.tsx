import type { ReactNode } from 'react';

// Small dependency-free SVG/CSS charts that reproduce the legacy recharts look (no charting library is installed in this repo).

export interface BarDatum {
  label: string;
  value: number;
  color: string;
  /** shown in the native tooltip */
  hint?: string;
}

/** Horizontal bars with the value at the right end; each bar is a button when `onSelect` is given. */
export function HBars({ data, onSelect, barHeight = 26, labelWidth = 80 }: { data: BarDatum[]; onSelect?: (d: BarDatum) => void; barHeight?: number; labelWidth?: number }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <div style={{ display: 'grid', gap: 10, alignContent: 'center', height: '100%' }}>
      {data.map((d) => {
        const bar = (
          <>
            <span style={{ width: labelWidth, flex: 'none', textAlign: 'right', color: 'var(--text2)', fontSize: 12.5 }}>{d.label}</span>
            <span style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
              <span
                title={d.hint ?? `${d.label}: ${d.value}`}
                style={{ height: barHeight, width: `${Math.max(1, (d.value / max) * 100)}%`, maxWidth: 'calc(100% - 44px)', background: d.color, borderRadius: '0 8px 8px 0', minWidth: 3 }}
              />
              <span style={{ fontSize: 12, color: 'var(--text2)' }}>{d.value}</span>
            </span>
          </>
        );
        const style = { display: 'flex', alignItems: 'center', gap: 10, width: '100%', background: 'none', border: 0, padding: 0, font: 'inherit', color: 'inherit' } as const;
        return onSelect ? (
          <button key={d.label} type="button" style={{ ...style, cursor: 'pointer' }} onClick={() => onSelect(d)} aria-label={`${d.label}: ${d.value}`}>
            {bar}
          </button>
        ) : (
          <div key={d.label} style={style}>
            {bar}
          </div>
        );
      })}
    </div>
  );
}

export interface SliceDatum {
  name: string;
  value: number;
}

/** Donut chart with a centre label. */
export function Donut({ data, colors, centre, size = 200, onSelect }: { data: SliceDatum[]; colors: string[]; centre?: ReactNode; size?: number; onSelect?: (name: string) => void }) {
  const total = data.reduce((t, s) => t + s.value, 0) || 1;
  const r = size * 0.38;
  const c = 2 * Math.PI * r;
  let acc = 0;
  return (
    <div style={{ position: 'relative', width: size, height: size, margin: '0 auto' }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label="Distribution chart">
        <g transform={`rotate(-90 ${size / 2} ${size / 2})`}>
          {data.map((s, i) => {
            const len = (s.value / total) * c;
            const gap = data.length > 1 ? 3 : 0;
            const el = (
              <circle
                key={s.name}
                cx={size / 2}
                cy={size / 2}
                r={r}
                fill="none"
                stroke={colors[i % colors.length]}
                strokeWidth={size * 0.15}
                strokeDasharray={`${Math.max(0, len - gap)} ${c - Math.max(0, len - gap)}`}
                strokeDashoffset={-acc}
                style={{ cursor: onSelect ? 'pointer' : undefined }}
                onClick={() => onSelect?.(s.name)}
              >
                <title>{`${s.name}: ${s.value}`}</title>
              </circle>
            );
            acc += len;
            return el;
          })}
        </g>
      </svg>
      {centre && <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', pointerEvents: 'none' }}>{centre}</div>}
    </div>
  );
}

/** Vertical bars with a count on top (job ageing). */
export function VBars({ data, height = 140, onSelect }: { data: BarDatum[]; height?: number; onSelect?: (d: BarDatum) => void }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-around', height, gap: 12 }}>
      {data.map((d) => (
        <div
          key={d.label}
          style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, maxWidth: 80, cursor: onSelect ? 'pointer' : undefined }}
          {...(onSelect ? { role: 'button', tabIndex: 0, 'aria-label': `${d.label}: ${d.value}`, onClick: () => onSelect(d), onKeyDown: (e: React.KeyboardEvent) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect(d); } } } : {})}
        >
          <span style={{ fontSize: 12, color: 'var(--text2)' }}>{d.value}</span>
          <div title={`${d.label}: ${d.value}`} style={{ width: '100%', height: Math.max(3, (d.value / max) * (height - 40)), background: d.color, borderRadius: '6px 6px 0 0' }} />
          <span style={{ fontSize: 12, color: 'var(--text2)' }}>{d.label}</span>
        </div>
      ))}
    </div>
  );
}

export interface ComboDatum {
  label: string;
  bar: number;
  line: number | null;
}

/** Bars (left axis) with a line on a second axis (right axis, days). */
export function BarLine({ data, barName, lineName, height = 260, onSelect }: { data: ComboDatum[]; barName: string; lineName: string; height?: number; onSelect?: (index: number) => void }) {
  const W = 520;
  const pad = { l: 30, r: 34, t: 14, b: 26 };
  const innerW = W - pad.l - pad.r;
  const innerH = height - pad.t - pad.b;
  const maxBar = Math.max(1, ...data.map((d) => d.bar));
  const maxLine = Math.max(1, ...data.map((d) => d.line ?? 0));
  const step = innerW / Math.max(1, data.length);
  const x = (i: number) => pad.l + step * i + step / 2;
  const pts = data.map((d, i) => (d.line == null ? null : ([x(i), pad.t + innerH - (d.line / maxLine) * innerH] as const)));
  const path = pts.reduce((s, p) => (p ? s + `${s ? 'L' : 'M'}${p[0]},${p[1]} ` : s), '');
  return (
    <svg viewBox={`0 0 ${W} ${height}`} width="100%" height="100%" role="img" aria-label={`${barName} and ${lineName} by month`} preserveAspectRatio="xMidYMid meet">
      {[0, 0.5, 1].map((f) => (
        <line key={f} x1={pad.l} x2={W - pad.r} y1={pad.t + innerH * f} y2={pad.t + innerH * f} stroke="var(--line)" />
      ))}
      <text x={pad.l - 6} y={pad.t + 4} textAnchor="end" fontSize="11" fill="var(--muted)">{maxBar}</text>
      <text x={W - pad.r + 6} y={pad.t + 4} fontSize="11" fill="var(--muted)">{maxLine}d</text>
      {data.map((d, i) => {
        const h = (d.bar / maxBar) * innerH;
        return (
          <g
            key={d.label}
            style={{ cursor: onSelect ? 'pointer' : undefined }}
            {...(onSelect ? { role: 'button', tabIndex: 0, 'aria-label': `${d.label}: ${d.bar} ${barName.toLowerCase()}`, onClick: () => onSelect(i), onKeyDown: (e: React.KeyboardEvent) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect(i); } } } : {})}
          >
            {onSelect && <rect x={x(i) - step / 2} y={pad.t} width={step} height={innerH + 20} fill="transparent" />}
            <rect x={x(i) - 15} y={pad.t + innerH - h} width={30} height={h} rx={6} fill="#4f46e5">
              <title>{`${d.label}: ${d.bar} ${barName.toLowerCase()}`}</title>
            </rect>
            <text x={x(i)} y={height - 8} textAnchor="middle" fontSize="12" fill="var(--text2)">{d.label}</text>
          </g>
        );
      })}
      {path && <path d={path} fill="none" stroke="#f59e0b" strokeWidth={2.5} />}
      {pts.map((p, i) => p && (
        <circle key={i} cx={p[0]} cy={p[1]} r={4} fill="#f59e0b">
          <title>{`${data[i]!.label}: ${data[i]!.line} days`}</title>
        </circle>
      ))}
    </svg>
  );
}
