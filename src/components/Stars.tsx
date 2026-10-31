import { Star } from 'lucide-react';

/** Read-only when `onChange` is omitted. Clicking the current value clears the rating. */
export function Stars({ value = 0, onChange, size = 18 }: { value?: number; onChange?: (n: number) => void; size?: number }) {
  return (
    <span style={{ display: 'inline-flex', gap: 2 }} role={onChange ? 'group' : 'img'} aria-label={onChange ? 'Rating' : `${value} out of 5`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          disabled={!onChange}
          onClick={() => onChange?.(n === value ? 0 : n)}
          aria-label={`${n} star${n > 1 ? 's' : ''}`}
          aria-pressed={onChange ? n <= value : undefined}
          style={{ border: 0, background: 'none', padding: 0, cursor: onChange ? 'pointer' : 'default', color: n <= Math.round(value) ? '#f59e0b' : 'var(--line)' }}
        >
          <Star size={size} fill={n <= Math.round(value) ? 'currentColor' : 'none'} />
        </button>
      ))}
    </span>
  );
}
