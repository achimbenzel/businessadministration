import { useState } from 'react';

/**
 * Reorder a list by dragging a handle (mouse, pen or finger), without a
 * library. Items in `container` carry `data-sort-id`; `grab(id)` gives the
 * props for the handle. While dragging, `itemState(id)` gives classes / a
 * transform; on drop `onMove(from, to)` gets list indexes.
 */
export function useSortable({ ids, container, onMove, threshold = 4 }) {
  const [drag, setDrag] = useState(null);
  const grab = (id) => ({
    onPointerDown: (e) => {
      if (e.button !== 0 && e.pointerType === 'mouse') return;
      const from = ids.indexOf(id);
      if (from === -1) return;
      e.preventDefault(); // no text selection, no native drag
      const y0 = e.clientY;
      const st = { id, from, to: from, dy: 0, on: false };
      const move = (ev) => {
        st.dy = ev.clientY - y0;
        if (!st.on) {
          if (Math.abs(st.dy) < threshold) return;
          st.on = true;
          document.body.classList.add('sorting');
        }
        ev.preventDefault();
        // The item under the pointer: before it in its upper half, after it in its lower half.
        let hit = null; let best = Infinity;
        for (const el of container.current?.querySelectorAll('[data-sort-id]') || []) {
          const r = el.getBoundingClientRect();
          const d = Math.max(r.top - ev.clientY, 0, ev.clientY - r.bottom);
          if (d < best) { best = d; hit = { el, r }; }
        }
        const idx = hit ? ids.indexOf(hit.el.dataset.sortId) : -1;
        if (idx !== -1) {
          const upper = ev.clientY < hit.r.top + hit.r.height / 2;
          st.to = upper ? (idx > st.from ? idx - 1 : idx) : (idx >= st.from ? idx : idx + 1);
          st.to = Math.max(0, Math.min(ids.length - 1, st.to));
        }
        // Scroll near the window's edges.
        if (ev.clientY < 70) window.scrollBy(0, -14);
        else if (ev.clientY > window.innerHeight - 70) window.scrollBy(0, 14);
        setDrag({ ...st });
      };
      const up = () => {
        window.removeEventListener('pointermove', move);
        window.removeEventListener('pointerup', up);
        window.removeEventListener('pointercancel', up);
        document.body.classList.remove('sorting');
        if (st.on && st.to !== st.from) onMove(st.from, st.to);
        setDrag(null);
      };
      window.addEventListener('pointermove', move, { passive: false });
      window.addEventListener('pointerup', up);
      window.addEventListener('pointercancel', up);
    },
    style: { touchAction: 'none' },
  });
  // Classes / style for an item while something is dragged.
  const itemState = (id) => {
    if (!drag?.on) return { className: '', style: undefined };
    if (drag.id === id) return { className: 'sort-dragging', style: { transform: `translateY(${drag.dy}px)` } };
    if (ids.indexOf(id) === drag.to) return { className: drag.to > drag.from ? 'sort-after' : 'sort-before', style: undefined };
    return { className: '', style: undefined };
  };
  return { dragging: Boolean(drag?.on), grab, itemState };
}

/** Move one item of a list from index `from` to index `to`. */
export function moveItem(list, from, to) {
  const next = [...list];
  const [x] = next.splice(from, 1);
  next.splice(to, 0, x);
  return next;
}
