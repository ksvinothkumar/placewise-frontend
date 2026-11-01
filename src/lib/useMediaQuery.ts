import { useSyncExternalStore } from 'react';

/** Subscribes to a CSS media query; false where matchMedia is unavailable (tests, SSR). */
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (notify) => {
      if (typeof matchMedia !== 'function') return () => undefined;
      const mq = matchMedia(query);
      mq.addEventListener('change', notify);
      return () => mq.removeEventListener('change', notify);
    },
    () => typeof matchMedia === 'function' && matchMedia(query).matches,
    () => false,
  );
}

/** Same breakpoint the stylesheet uses to hide the fixed sidebar. */
export const useIsMobileNav = () => useMediaQuery('(max-width:1000px)');
