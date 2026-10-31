import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useSessionStore } from '@/stores/session.store';

export function BootSplash() {
  return (
    <div role="status" aria-label="Loading" style={{ minHeight: '100%', display: 'grid', placeItems: 'center', color: 'var(--muted)' }}>
      Loading…
    </div>
  );
}

/** Layout route: signed-in users only. Waits for the refresh-cookie bootstrap before deciding. */
export function RequireAuth() {
  const status = useSessionStore((s) => s.status);
  const loc = useLocation();
  if (status === 'booting') return <BootSplash />;
  if (status === 'anon') return <Navigate to="/login" replace state={{ from: loc.pathname + loc.search }} />;
  return <Outlet />;
}
