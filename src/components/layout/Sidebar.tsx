import { Sparkles } from 'lucide-react';
import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useCanFn } from '@/lib/permissions';
import { useSessionStore } from '@/stores/session.store';
import { useUiStore } from '@/stores/ui.store';
import { LogoMark, Wordmark } from '../Logo';
import { visibleGroups } from './nav';

export function Sidebar({ counts }: { counts: Record<string, number | undefined> }) {
  const can = useCanFn();
  const collapsed = useUiStore((s) => s.navCollapsed);
  const ai = useSessionStore((s) => s.ai);
  /** Collapsed menu shows icons only, so hovering or focusing one shows its name beside it. Fixed-position so the scrolling menu cannot clip it. */
  const [tip, setTip] = useState<{ label: string; top: number; left: number } | null>(null);
  const show = (label: string) => (e: React.SyntheticEvent<HTMLElement>) => {
    if (!collapsed) return;
    const r = e.currentTarget.getBoundingClientRect();
    setTip({ label, top: r.top + r.height / 2, left: r.right + 10 });
  };
  const hide = () => setTip(null);
  return (
    <aside className="sidebar">
      <div className="brand">
        <LogoMark size={36} />
        <Wordmark />
      </div>
      <nav className="nav">
        {visibleGroups(can).map(([group, items]) => (
          <div key={group}>
            <div className="nav-group">{group}</div>
            {items.map(({ to, icon: Icon, label }) => (
              <NavLink key={to} to={to} aria-label={collapsed ? label : undefined} onMouseEnter={show(label)} onFocus={show(label)} onMouseLeave={hide} onBlur={hide} onClick={hide}>
                <Icon size={19} />
                <span className="label">{label}</span>
                {counts[to] != null && <span className="count">{counts[to]}</span>}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>
      {collapsed && tip && (
        <div className="nav-tip" role="tooltip" style={{ top: tip.top, left: tip.left }}>
          {tip.label}
        </div>
      )}
      <div className="side-card">
        <b>
          <Sparkles size={13} style={{ verticalAlign: -2 }} /> {ai ? 'AI parsing is on' : 'Smart matching'}
        </b>
        {ai ? 'Resumes are parsed with Claude.' : 'Rule-based resume parsing. Add an API key to enable AI.'}
      </div>
    </aside>
  );
}
