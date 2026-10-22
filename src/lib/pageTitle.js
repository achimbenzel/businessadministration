// The current page's title — for the browser tab and the phone's top bar.
import { useEffect, useSyncExternalStore } from 'react';

const APP = 'BA Lernplattform';
let current = '';
const listeners = new Set();

function set(title) {
  current = title || '';
  document.title = current ? `${current} · ${APP}` : APP;
  for (const l of listeners) l();
}

export function usePageTitle(title) {
  useEffect(() => { set(title); }, [title]);
}

export function useCurrentTitle() {
  return useSyncExternalStore((l) => { listeners.add(l); return () => listeners.delete(l); }, () => current, () => '');
}
