// Debounced autosave that never drops an edit.
//
// A saver *runs* pending saves early instead of throwing them away: when the
// page unmounts, when the tab is hidden and when the page is closed (then as
// keepalive requests). Saves run one after another, so each one is based on
// the revision the previous one returned (no false conflicts).
import { useEffect, useRef } from 'react';

const mounted = new Set();
let listening = false;

function listen() {
  if (listening || typeof window === 'undefined') return;
  listening = true;
  window.addEventListener('pagehide', () => { for (const s of mounted) s.flush(undefined, { keepalive: true }); });
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') for (const s of mounted) s.flush();
  });
  // Last line of defence: the browser asks before closing a tab with unsaved edits.
  window.addEventListener('beforeunload', (e) => {
    if ([...mounted].some((s) => !s.idle())) { e.preventDefault(); e.returnValue = ''; }
  });
}

function createSaver(defaultDelay) {
  const jobs = new Map(); // key → { timer, run }
  let chain = Promise.resolve();
  let inflight = 0;
  const exec = (run, opts = {}) => {
    inflight += 1;
    const done = () => { inflight -= 1; };
    // While the page closes there's no time to wait for the queue.
    if (opts.keepalive) {
      const p = Promise.resolve().then(() => run(opts)).catch(() => {}).finally(done);
      return p;
    }
    chain = chain.then(() => run(opts)).catch(() => {}).finally(done);
    return chain;
  };
  return {
    /** (Re)start the timer for `key`. `run` performs the save (reading the
     *  latest values itself) and handles its own errors. */
    schedule(key, run, { delay = defaultDelay, immediate = false } = {}) {
      const prev = jobs.get(key);
      if (prev) clearTimeout(prev.timer);
      if (immediate) { jobs.delete(key); exec(run); return; }
      jobs.set(key, { run, timer: setTimeout(() => { jobs.delete(key); exec(run); }, delay) });
    },
    /** Run pending saves now (all, or just `key`); resolves when they're done. */
    flush(key, opts = {}) {
      for (const k of key === undefined ? [...jobs.keys()] : [key]) {
        const job = jobs.get(k);
        if (!job) continue;
        clearTimeout(job.timer);
        jobs.delete(k);
        exec(job.run, opts);
      }
      return chain;
    },
    /** Drop pending saves (e.g. after "reload" on a conflict). */
    cancel() { for (const job of jobs.values()) clearTimeout(job.timer); jobs.clear(); },
    /** Nothing waiting and nothing on the wire. */
    idle: () => jobs.size === 0 && inflight === 0,
  };
}

/** One saver per component; flushed on unmount / tab hide / page close. */
export function useSaver(defaultDelay = 600) {
  const ref = useRef(null);
  if (!ref.current) ref.current = createSaver(defaultDelay);
  useEffect(() => {
    listen();
    const saver = ref.current;
    mounted.add(saver);
    return () => { saver.flush(); mounted.delete(saver); };
  }, []);
  return ref.current;
}
