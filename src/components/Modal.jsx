// A dialog: centred on desktop, a bottom sheet on the phone (see .modal in
// base.css). Escape and a click on the backdrop close it.
import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

// focusInput: start in the first field (default). Off for dialogs where the phone's
// keyboard would only cover the choices (the block picker).
export default function Modal({ title, onClose, children, footer, size = 'md', className = '', labelledBy, focusInput = true }) {
  const ref = useRef(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    const prevFocus = document.activeElement;
    const onKey = (e) => { if (e.key === 'Escape') { e.stopPropagation(); onCloseRef.current?.(); } };
    document.addEventListener('keydown', onKey);
    document.body.classList.add('modal-open');
    // Focus the first field (or the dialog itself) so the keyboard starts inside.
    const first = ref.current?.querySelector(focusInput ? '[data-autofocus], input:not([type=hidden]), textarea, select' : '[data-autofocus]');
    (first || ref.current)?.focus({ preventScroll: true });
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.classList.remove('modal-open');
      prevFocus?.focus?.({ preventScroll: true });
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return createPortal(
    <div className="overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose?.(); }}>
      <div className={`modal modal-${size} ${className}`} role="dialog" aria-modal="true" aria-label={labelledBy ? undefined : title}
        aria-labelledby={labelledBy} ref={ref} tabIndex={-1}>
        {title != null && (
          <div className="modal-head">
            <h2>{title}</h2>
            <button className="icon-btn icon-btn-ghost" onClick={onClose} aria-label="Schließen"><X size={18} /></button>
          </div>
        )}
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-foot">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}
