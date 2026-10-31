import { Navigate, Outlet } from 'react-router-dom';
import { useCan } from '@/lib/permissions';

/** Layout route: renders children only when the user holds `perm`, otherwise sends them to the dashboard. */
export function RequirePermission({ perm }: { perm: string }) {
  return useCan(perm) ? <Outlet /> : <Navigate to="/dashboard" replace />;
}
