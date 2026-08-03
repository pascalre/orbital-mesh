import { useSyncExternalStore } from 'react';

/**
 * Returns true when the viewport is at or below `breakpoint` px wide.
 *
 * Implemented with useSyncExternalStore so it subscribes to `matchMedia`
 * directly — no effect, no cascading setState, and it's SSR-safe.
 */
export function useIsMobile(breakpoint = 768): boolean {
  const query = `(max-width: ${breakpoint}px)`;

  const subscribe = (onChange: () => void) => {
    if (typeof window === 'undefined' || !window.matchMedia) return () => {};
    const mql = window.matchMedia(query);
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  };

  const getSnapshot = () => {
    if (typeof window === 'undefined' || !window.matchMedia) return false;
    return window.matchMedia(query).matches;
  };

  // Server render (no window) always reports "not mobile".
  const getServerSnapshot = () => false;

  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
