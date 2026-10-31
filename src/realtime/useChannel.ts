import { useEffect, useRef } from 'react';
import { getSocket } from './socket';

/** Subscribe to a Socket.IO event for the lifetime of the component. The handler may change every render without resubscribing. */
export function useChannel<T = unknown>(event: string, handler: (payload: T) => void) {
  const ref = useRef(handler);
  useEffect(() => {
    ref.current = handler;
  });
  useEffect(() => {
    const s = getSocket();
    const fn = (p: T) => ref.current(p);
    s.on(event, fn);
    return () => {
      s.off(event, fn);
    };
  }, [event]);
}
