// localStorage, safely: private windows and blocked storage throw on access,
// so every read and write is guarded and falls back to the default.
// Used only for per-device conveniences (sidebar state, learning progress).
import { useCallback, useSyncExternalStore } from 'react';

const PREFIX = 'ba:';
const listeners = new Set();
const cache = new Map();

export function getPref(key, fallback) {
  if (cache.has(key)) return cache.get(key);
  let value = fallback;
  try {
    const raw = window.localStorage.getItem(PREFIX + key);
    if (raw != null) value = JSON.parse(raw);
  } catch { /* no storage */ }
  cache.set(key, value);
  return value;
}

export function setPref(key, value) {
  cache.set(key, value);
  try { window.localStorage.setItem(PREFIX + key, JSON.stringify(value)); } catch { /* no storage */ }
  for (const l of listeners) l();
}

// Another tab changed a value.
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (!e.key?.startsWith(PREFIX)) return;
    cache.delete(e.key.slice(PREFIX.length));
    for (const l of listeners) l();
  });
}

const subscribe = (l) => { listeners.add(l); return () => listeners.delete(l); };

/** [value, setValue] for a stored preference, shared by every component using it. */
export function usePref(key, fallback) {
  const value = useSyncExternalStore(subscribe, () => getPref(key, fallback), () => fallback);
  const set = useCallback((next) => setPref(key, typeof next === 'function' ? next(getPref(key, fallback)) : next), [key, fallback]);
  return [value, set];
}
