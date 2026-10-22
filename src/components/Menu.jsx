// An actions menu behind a "⋯" button: a popover that stays inside the window
// on desktop, a bottom sheet with large rows on the phone.
import { useLayoutEffect, useRef, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Ellipsis } from 'lucide-react';
import { PHONE, useMediaQuery } from '../lib/useMedia.js';

/**
 * items: [{ label, icon, onClick, danger, disabled, hint } | '-' (separator) | { heading }]
 */
export default function Menu({ items, label = 'Aktionen', icon: Icon = Ellipsis, className = '', buttonClass = 'icon-btn icon-btn-ghost', align = 'end' }) {
  const [open, setOpen] = useState(false);
  const btn = useRef(null);
  return (
    <>
      <button ref={btn} type="button" className={`${buttonClass} ${className}`} aria-label={label} title={label}
        aria-haspopup="menu" aria-expanded={open} onClick={(e) => { e.stopPropagation(); setOpen((o) => !o); }}>
        <Icon size={18} />
      </button>
      {open && <MenuPanel anchor={btn} items={items} align={align} label={label} onClose={() => setOpen(false)} />}
    </>
  );
}

export function MenuPanel({ anchor, items, onClose, align = 'end', label, children }) {
  const phone = useMediaQuery(PHONE);
  const panel = useRef(null);
  const [pos, setPos] = useState(null);

  useLayoutEffect(() => {
    if (phone || !anchor?.current || !panel.current) return;
    const a = anchor.current.getBoundingClientRect();
    const p = panel.current.getBoundingClientRect();
    const m = 8;
    let left = align === 'start' ? a.left : a.right - p.width;
    left = Math.max(m, Math.min(left, window.innerWidth - p.width - m));
    let top = a.bottom + 6;
    if (top + p.height > window.innerHeight - m) top = Math.max(m, a.top - p.height - 6);
    setPos({ left, top });
  }, [phone, anchor, align]);

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    const onDown = (e) => {
      if (panel.current?.contains(e.target) || anchor?.current?.contains(e.target)) return;
      onClose();
    };
    const onScroll = (e) => { if (!panel.current?.contains(e.target)) onClose(); };
    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onDown);
    if (!phone) window.addEventListener('scroll', onScroll, true);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onDown);
      window.removeEventListener('scroll', onScroll, true);
    };
  }, [onClose, anchor, phone]);

  const body = children || items.map((it, i) => {
    if (it === '-') return <div key={i} className="menu-sep" role="separator" />;
    if (it.heading) return <div key={i} className="menu-heading">{it.heading}</div>;
    const I = it.icon;
    return (
      <button key={i} type="button" role="menuitem" className={`menu-item ${it.danger ? 'danger' : ''}`} disabled={it.disabled}
        onClick={() => { onClose(); it.onClick?.(); }}>
        {I && <I size={16} />}<span className="menu-label">{it.label}</span>{it.hint && <span className="menu-hint">{it.hint}</span>}
      </button>
    );
  });

  if (phone) {
    return createPortal(
      <div className="sheet-backdrop" onPointerDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
        <div className="sheet" role="menu" aria-label={label} ref={panel}>
          <div className="sheet-grip" />
          {body}
        </div>
      </div>,
      document.body,
    );
  }
  return createPortal(
    <div className="menu" role="menu" aria-label={label} ref={panel}
      style={pos ? { left: pos.left, top: pos.top } : { visibility: 'hidden', left: 0, top: 0 }}>
      {body}
    </div>,
    document.body,
  );
}
