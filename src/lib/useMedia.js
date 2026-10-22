// The app's breakpoints as media queries (the same as in the CSS, see
// src/styles/README.md) and a hook to follow one.
import { useSyncExternalStore } from 'react';

export const PHONE = '(max-width: 640px)';
export const DESKTOP = '(min-width: 900px)';
export const TOUCH = '(hover: none), (pointer: coarse)';

export function useMediaQuery(query) {
  return useSyncExternalStore(
    (cb) => { const m = window.matchMedia(query); m.addEventListener('change', cb); return () => m.removeEventListener('change', cb); },
    () => window.matchMedia(query).matches,
    () => false,
  );
}
