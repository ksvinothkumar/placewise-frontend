import { useSessionStore } from '@/stores/session.store';

/** Pure check, usable outside React. `*` grants everything (super-admin roles). */
export const hasPermission = (permissions: readonly string[], needed: string) => permissions.includes('*') || permissions.includes(needed);

/**
 * The one permission hook: `useCan('jobs:view')`. Fed by the `permissions[]` returned at login / `GET /auth/me`.
 * The UI hides what the user cannot do; the backend enforces it.
 */
export function useCan(permission: string | undefined | null): boolean {
  return useSessionStore((s) => !permission || hasPermission(s.permissions, permission));
}

/** For code that needs several checks at once (menus). */
export function useCanFn(): (permission?: string | null) => boolean {
  const permissions = useSessionStore((s) => s.permissions);
  return (permission) => !permission || hasPermission(permissions, permission);
}
