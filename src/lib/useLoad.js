// Load data for a page: { data, error, loading, reload, setData }.
// A response that arrives after the page moved on (other id) is ignored.
import { useCallback, useEffect, useRef, useState } from 'react';

export function useLoad(fn, deps) {
  const [state, setState] = useState({ data: null, error: null, loading: true });
  const seq = useRef(0);
  const fnRef = useRef(fn);
  fnRef.current = fn;

  // reset: forget what's shown (another page's data) instead of keeping it
  // on screen until the new data is there.
  const reload = useCallback(async ({ reset = false } = {}) => {
    const n = ++seq.current;
    setState((s) => (reset ? { data: null, error: null, loading: true } : { ...s, loading: true, error: null }));
    try {
      const data = await fnRef.current();
      if (n === seq.current) setState({ data, error: null, loading: false });
      return data;
    } catch (error) {
      if (n === seq.current) setState({ data: null, error, loading: false });
      return null;
    }
  }, []);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { reload({ reset: true }); }, deps);

  const setData = useCallback((upd) => setState((s) => ({ ...s, data: typeof upd === 'function' ? upd(s.data) : upd })), []);
  return { ...state, reload, setData };
}
