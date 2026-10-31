import { useSyncExternalStore } from 'react';
import { getSocket } from './socket';

/**
 * Who is online and whether the socket is up. Ephemeral realtime state that is not server data, so it is a tiny external store
 * rather than React Query. The server only pushes `presence:list` on connect, so callers seed it from REST (`GET /chat/users`
 * carries an `online` flag) when they mount; `presence` events then keep it current.
 */
interface Snapshot {
  online: ReadonlySet<string>;
  connected: boolean;
}
let snap: Snapshot = { online: new Set(), connected: false };
const subs = new Set<() => void>();
let attached = false;

const set = (patch: Partial<Snapshot>) => {
  snap = { ...snap, ...patch };
  subs.forEach((f) => f());
};

function attach() {
  if (attached) return;
  attached = true;
  const s = getSocket();
  set({ connected: s.connected });
  s.on('connect', () => set({ connected: true }));
  s.on('disconnect', () => set({ connected: false }));
  s.on('presence:list', (ids: string[]) => set({ online: new Set(ids) }));
  s.on('presence', ({ userId, online }: { userId: string; online: boolean }) => {
    const next = new Set(snap.online);
    if (online) next.add(userId);
    else next.delete(userId);
    set({ online: next });
  });
}

export const seedPresence = (ids: Iterable<string>) => set({ online: new Set(ids) });

const subscribe = (fn: () => void) => {
  attach();
  subs.add(fn);
  return () => void subs.delete(fn);
};

export function usePresence(): Snapshot {
  return useSyncExternalStore(subscribe, () => snap);
}

/** test helper */
export const __resetPresence = () => {
  snap = { online: new Set(), connected: false };
  attached = false;
};
