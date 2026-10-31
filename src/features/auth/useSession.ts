import { useSessionStore } from '@/stores/session.store';

/** Convenience selector bundle for auth UI. */
export function useSession() {
  const user = useSessionStore((s) => s.user);
  const status = useSessionStore((s) => s.status);
  return { user, status, isAuthed: status === 'authed' };
}
