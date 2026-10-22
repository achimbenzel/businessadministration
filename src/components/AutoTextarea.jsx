// A textarea that grows with its content (no inner scrollbar).
import { forwardRef, useCallback, useLayoutEffect, useRef } from 'react';

const AutoTextarea = forwardRef(function AutoTextarea({ value, onChange, className = '', minRows = 1, ...rest }, outer) {
  const inner = useRef(null);
  const setRef = useCallback((el) => {
    inner.current = el;
    if (typeof outer === 'function') outer(el); else if (outer) outer.current = el;
  }, [outer]);
  const fit = () => {
    const el = inner.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight + 2}px`;
  };
  useLayoutEffect(fit, [value]);
  useLayoutEffect(() => {
    // Width changes (rotation, sidebar) change the line count too.
    const ro = new ResizeObserver(() => fit());
    if (inner.current) ro.observe(inner.current);
    return () => ro.disconnect();
  }, []);
  return <textarea ref={setRef} rows={minRows} value={value} onChange={onChange} className={`autotext ${className}`} {...rest} />;
});

export default AutoTextarea;
