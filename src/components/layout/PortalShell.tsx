import { Moon, Sun } from 'lucide-react';
import { Link, Navigate, Outlet, useLocation } from 'react-router-dom';
import { useApiQuery } from '@/api/hooks';
import { useUiStore } from '@/stores/ui.store';
import { LogoMark } from '../Logo';
import Notifications from '../Notifications';
import { UserMenu } from './UserMenu';

// Slim frame for client (customer) accounts: their jobs, shortlists and interviews only.
export function PortalShell() {
  const { theme, toggleTheme } = useUiStore();
  const loc = useLocation();
  const { data: me } = useApiQuery<{ client: { name: string } }>('/portal/me', undefined, { retry: false });
  if (!/^\/(portal|profile)/.test(loc.pathname)) return <Navigate to="/portal" replace />;
  return (
    <div className="portal">
      <header className="topbar" style={{ padding: '0 28px' }}>
        <Link to="/portal" style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <LogoMark size={34} shadow={false} />
          <b style={{ fontSize: 17, letterSpacing: '-.02em' }}>
            Place<span style={{ color: 'var(--brand)' }}>wise</span>
          </b>
        </Link>
        <span className="badge brand" style={{ marginLeft: 6 }}>
          Client portal
        </span>
        {me && <b style={{ marginLeft: 10, color: 'var(--text2)', fontWeight: 600 }}>{me.client.name}</b>}
        <span style={{ flex: 1 }} />
        <Notifications />
        <button className="iconbtn" onClick={toggleTheme} aria-label="Toggle theme">
          {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
        </button>
        <UserMenu />
      </header>
      <main className="content" style={{ maxWidth: 1120 }}>
        <Outlet />
      </main>
    </div>
  );
}
