import { Navigate, Outlet } from 'react-router-dom';
import { useSessionStore } from '@/stores/session.store';
import { BootSplash } from './RequireAuth';

export const homeFor = (role?: string) => (role === 'client' ? '/portal' : '/dashboard');

/** Layout route for /login: signed-in users are bounced to their home. */
export function PublicOnly() {
  const status = useSessionStore((s) => s.status);
  const role = useSessionStore((s) => s.user?.role);
  if (status === 'booting') return <BootSplash />;
  if (status === 'authed') return <Navigate to={homeFor(role)} replace />;
  return <Outlet />;
}
