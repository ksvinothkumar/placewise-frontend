import { Check, ChevronDown, Search } from 'lucide-react';
import { useEffect, useId, useMemo, useRef, useState } from 'react';

export interface SearchOption {
  value: string;
  label: string;
}

interface Props {
  options: SearchOption[];
  value: string;
  onChange: (value: string) => void;
  /** Label of the "nothing chosen" row, e.g. "All clients". Picking it sets the value to ''. */
  allLabel: string;
  /** Accessible name; the search box is named "Search <label>". */
  label: string;
  width?: number;
}

/** A dropdown with a search box: type to narrow the list, Enter picks the first match, Esc or an outside click closes it. */
export function SearchSelect({ options, value, onChange, allLabel, label, width = 220 }: Props) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const root = useRef<HTMLDivElement>(null);
  const id = useId();

  useEffect(() => {
    if (!open) return;
    const away = (e: MouseEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', away);
    return () => document.removeEventListener('mousedown', away);
  }, [open]);

  const shown = useMemo(() => {
    const t = q.trim().toLowerCase();
    return t ? options.filter((o) => o.label.toLowerCase().includes(t)) : options;
  }, [options, q]);
  const current = options.find((o) => o.value === value);

  const pick = (v: string) => {
    onChange(v);
    setOpen(false);
    setQ('');
  };

  return (
    <div className="ss" ref={root} style={{ width }} onKeyDown={(e) => e.key === 'Escape' && setOpen(false)}>
      <button type="button" className="select ss-btn" aria-label={label} aria-haspopup="listbox" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        <span>{current?.label ?? allLabel}</span>
        <ChevronDown size={14} />
      </button>
      {open && (
        <div className="ss-pop">
          <div className="ss-search">
            <Search size={14} />
            <input
              autoFocus
              value={q}
              placeholder="Search…"
              aria-label={`Search ${label}`}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  if (shown[0]) pick(shown[0].value);
                  else if (!q.trim()) pick('');
                }
              }}
            />
          </div>
          <ul role="listbox" id={id} aria-label={label}>
            {!q.trim() && (
              <li role="option" aria-selected={value === ''} onClick={() => pick('')}>
                {allLabel}
                {value === '' && <Check size={13} />}
              </li>
            )}
            {shown.map((o) => (
              <li key={o.value} role="option" aria-selected={o.value === value} onClick={() => pick(o.value)}>
                {o.label}
                {o.value === value && <Check size={13} />}
              </li>
            ))}
            {!shown.length && <li className="ss-empty">No matches</li>}
          </ul>
        </div>
      )}
    </div>
  );
}
