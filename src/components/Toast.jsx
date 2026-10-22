// Short messages at the bottom ("Gelöscht · Rückgängig", errors).
import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { CircleCheck, CircleAlert, X } from 'lucide-react';

const ToastContext = createContext(() => {});

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const timers = useRef(new Map());

  const dismiss = useCallback((id) => {
    clearTimeout(timers.current.get(id));
    timers.current.delete(id);
    setToasts((list) => list.filter((t) => t.id !== id));
  }, []);

  /** toast(message, { kind: 'ok' | 'error' | 'info', action: { label, onClick }, duration }) */
  const toast = useCallback((message, opts = {}) => {
    const id = Math.random().toString(36).slice(2);
    const duration = opts.duration ?? (opts.action ? 7000 : opts.kind === 'error' ? 6000 : 3000);
    setToasts((list) => [...list.slice(-2), { id, message, kind: opts.kind || 'info', action: opts.action }]);
    if (duration > 0) timers.current.set(id, setTimeout(() => dismiss(id), duration));
    return id;
  }, [dismiss]);

  const api = useMemo(() => Object.assign(toast, { dismiss }), [toast, dismiss]);

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="toasts" role="status" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={`toast toast-${t.kind}`}>
            {t.kind === 'ok' && <CircleCheck size={17} className="toast-icon" />}
            {t.kind === 'error' && <CircleAlert size={17} className="toast-icon" />}
            <span className="toast-msg">{t.message}</span>
            {t.action && (
              <button className="toast-action" onClick={() => { dismiss(t.id); t.action.onClick(); }}>{t.action.label}</button>
            )}
            <button className="toast-close" aria-label="Schließen" onClick={() => dismiss(t.id)}><X size={15} /></button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);
