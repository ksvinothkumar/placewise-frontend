import { useEffect } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useSessionStore } from '@/stores/session.store';
import { useIsMobileNav } from '@/lib/useMediaQuery';
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
  const mobileNavOpen = useUiStore((s) => s.mobileNavOpen);
  const mobile = useIsMobileNav();
  const loc = useLocation();
  const { setPalette, togglePalette, setMobileNav } = useUiStore.getState();
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
  // The drawer closes after navigating, on Escape, and when the viewport grows back to desktop width.
  useEffect(() => setMobileNav(false), [loc.pathname, mobile, setMobileNav]);
  useEffect(() => {
    if (!mobileNavOpen) return;
    const h = (e: KeyboardEvent) => e.key === 'Escape' && setMobileNav(false);
    addEventListener('keydown', h);
    return () => removeEventListener('keydown', h);
  }, [mobileNavOpen, setMobileNav]);
  return (
    <div className={'app ' + (collapsed && !mobile ? 'collapsed ' : '') + (mobileNavOpen ? 'nav-open' : '')}>
      <Sidebar counts={counts} />
      <div className="nav-backdrop" onClick={() => setMobileNav(false)} aria-hidden="true" />
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
