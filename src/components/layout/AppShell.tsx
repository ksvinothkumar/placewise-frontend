import { useEffect } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useSessionStore } from '@/stores/session.store';
import { useUiStore } from '@/stores/ui.store';
import { useChatToasts } from '@/realtime/useChatToasts';
import CommandPalette from '../CommandPalette';
import { PortalShell } from './PortalShell';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { useNavCounts } from './useNavCounts';

/** Authenticated frame. Customer (client) accounts get the slim portal frame instead of the staff sidebar. */
export function AppShell() {
  const user = useSessionStore((s) => s.user);
  const loc = useLocation();
  if (!user) return null; // RequireAuth guarantees a user; this narrows the type
  // mustChangePassword confines every route to /profile until cleared
  if (user.mustChangePassword && loc.pathname !== '/profile') return <Navigate to="/profile" replace />;
  return user.role === 'client' ? <PortalShell /> : <StaffShell />;
}

function StaffShell() {
  const collapsed = useUiStore((s) => s.navCollapsed);
  const paletteOpen = useUiStore((s) => s.paletteOpen);
  const { setPalette, togglePalette } = useUiStore.getState();
  const { counts } = useNavCounts();
  useChatToasts(); // incoming-message toasts on every page, not only while Chat is open
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        togglePalette();
      }
    };
    addEventListener('keydown', h);
    return () => removeEventListener('keydown', h);
  }, [togglePalette]);
  return (
    <div className={'app ' + (collapsed ? 'collapsed' : '')}>
      <Sidebar counts={counts} />
      <div style={{ minWidth: 0 }}>
        <Topbar />
        <main className="content">
          <Outlet />
        </main>
      </div>
      {paletteOpen && <CommandPalette onClose={() => setPalette(false)} />}
    </div>
  );
}
