import { Moon, PanelLeftClose, PanelLeftOpen, Search, Sun } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { useUiStore } from '@/stores/ui.store';
import Notifications from '../Notifications';
import { TITLES } from './nav';
import { UserMenu } from './UserMenu';

export function Topbar() {
  const { navCollapsed, toggleNav, theme, toggleTheme, setPalette } = useUiStore();
  const loc = useLocation();
  const [, section, sub] = loc.pathname.split('/');
  return (
    <header className="topbar">
      <button
        className="iconbtn"
        onClick={toggleNav}
        aria-label={navCollapsed ? 'Open menu' : 'Close menu'}
        title={navCollapsed ? 'Open menu' : 'Close menu'}
      >
        {navCollapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
      </button>
      <div className="crumb">
        {TITLES[section ?? ''] || 'Dashboard'}
        {sub && <small>Details</small>}
      </div>
      <div
        className="cmdk"
        onClick={() => setPalette(true)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && setPalette(true)}
      >
        <Search size={16} />
        <span>Search jobs, candidates, actions…</span>
        <kbd>⌘K</kbd>
      </div>
      <Notifications />
      <button className="iconbtn" onClick={toggleTheme} aria-label="Toggle theme">
        {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
      </button>
      <UserMenu />
    </header>
  );
}
