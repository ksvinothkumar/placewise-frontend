import { ArrowRight, Briefcase, Moon, User, type LucideIcon } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { asList, useApiQuery } from '@/api/hooks';
import { useCan } from '@/lib/permissions';
import { useUiStore } from '@/stores/ui.store';

interface Job {
  id: string;
  title: string;
  client?: { name?: string };
}
interface Cand {
  id: string;
  name: string;
  title?: string;
}
interface Item {
  l: string;
  k: string;
  I: LucideIcon;
  run: () => void;
}

export default function CommandPalette({ onClose }: { onClose: () => void }) {
  const nav = useNavigate();
  const toggleTheme = useUiStore((s) => s.toggleTheme);
  const canJobs = useCan('jobs:view');
  const canCands = useCan('candidates:view');
  const jobs = useApiQuery<Job[]>(canJobs ? '/jobs' : null, undefined, { retry: false, staleTime: 60_000 });
  const cands = useApiQuery<Cand[]>(canCands ? '/candidates' : null, undefined, { retry: false, staleTime: 60_000 });
  const [q, setQ] = useState('');
  const [sel, setSel] = useState(0);
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => ref.current?.focus(), []);

  const items = useMemo<Item[]>(
    () => [
      ...(
        [
          ['Dashboard', '/dashboard'],
          ['Jobs', '/jobs'],
          ['Talent pool', '/candidates'],
          ['Pipeline', '/pipeline'],
          ['Interviews', '/interviews'],
          ['Clients', '/clients'],
        ] as const
      ).map(([l, to]) => ({ l: 'Go to ' + l, k: 'Navigate', I: ArrowRight, run: () => nav(to) })),
      { l: 'Import a resume', k: 'Action', I: User, run: () => nav('/candidates?import=1') },
      { l: 'Toggle dark mode', k: 'Action', I: Moon, run: toggleTheme },
      ...asList(jobs.data).map((j) => ({
        l: j.title,
        k: 'Job · ' + (j.client?.name ?? ''),
        I: Briefcase,
        run: () => nav('/jobs/' + j.id),
      })),
      ...asList(cands.data).map((c) => ({
        l: c.name,
        k: 'Candidate · ' + (c.title || ''),
        I: User,
        run: () => nav('/candidates/' + c.id),
      })),
    ],
    [jobs.data, cands.data, nav, toggleTheme],
  );
  const list = items.filter((i) => (i.l + i.k).toLowerCase().includes(q.toLowerCase())).slice(0, 40);
  const go = (i?: Item) => {
    onClose();
    i?.run();
  };
  return (
    <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal cmd" role="dialog" aria-label="Command palette">
        <input
          ref={ref}
          placeholder="Type a command, job or candidate…"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setSel(0);
          }}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown') {
              setSel((s) => Math.min(s + 1, list.length - 1));
              e.preventDefault();
            } else if (e.key === 'ArrowUp') {
              setSel((s) => Math.max(s - 1, 0));
              e.preventDefault();
            } else if (e.key === 'Enter') go(list[sel]);
            else if (e.key === 'Escape') onClose();
          }}
        />
        <ul>
          {list.map((i, n) => (
            <li key={n} className={n === sel ? 'sel' : ''} onMouseEnter={() => setSel(n)} onClick={() => go(i)}>
              <i.I size={16} />
              {i.l}
              <small>{i.k}</small>
            </li>
          ))}
          {!list.length && <li style={{ color: 'var(--muted)' }}>No results</li>}
        </ul>
      </div>
    </div>
  );
}
