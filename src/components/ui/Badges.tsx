import { scoreTone, stageColor } from '@/lib/format';

export function ScoreRing({ score, size = 42 }: { score: number; size?: number }) {
  const r = (size - 6) / 2;
  const c = 2 * Math.PI * r;
  const col = { good: 'var(--good)', warn: 'var(--warn)', bad: 'var(--bad)' }[scoreTone(score)];
  return (
    <div className="ring" style={{ width: size, height: size }} title={`Match score ${score}%`}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--line)" strokeWidth="4" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={col}
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - score / 100)}
        />
      </svg>
      <span>{score}</span>
    </div>
  );
}

export const StageBadge = ({ stage }: { stage: string }) => (
  <span className="badge" style={{ color: stageColor(stage), background: stageColor(stage) + '1a', borderColor: 'transparent' }}>
    <i className="dot" />
    {stage}
  </span>
);

export const Chips = ({ items = [], hit = [], miss = [], max }: { items?: string[]; hit?: string[]; miss?: string[]; max?: number }) => (
  <>
    {(max ? items.slice(0, max) : items).map((s) => (
      <span key={s} className={'chip ' + (hit.includes(s) ? 'hit' : miss.includes(s) ? 'miss' : '')}>
        {s}
      </span>
    ))}
    {max && items.length > max && <span className="chip">+{items.length - max}</span>}
  </>
);
