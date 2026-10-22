// The cookie notice: the app only sets the login cookie and keeps the learning
// progress in the browser — nothing that needs consent, so one "Verstanden"
// is enough. Shown until confirmed (remembered per browser).
import { useLayoutEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Cookie } from 'lucide-react';
import { usePref } from '../lib/prefs.js';

// Raise when the notice text changes, so everyone sees it once more.
const VERSION = 1;

export default function CookieNotice() {
  const [seen, setSeen] = usePref('cookieNotice', 0);
  const ref = useRef(null);
  const open = seen < VERSION;

  // While it's open, pages leave room for it at the bottom (--cookie-h) so
  // nothing — like the Impressum link below the login — ends up underneath.
  useLayoutEffect(() => {
    const el = ref.current;
    if (!open || !el) return undefined;
    const root = document.documentElement;
    const update = () => root.style.setProperty('--cookie-h', `${Math.ceil(el.getBoundingClientRect().height)}px`);
    update();
    root.dataset.cookie = 'open';
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => { ro.disconnect(); delete root.dataset.cookie; root.style.removeProperty('--cookie-h'); };
  }, [open]);

  if (!open) return null;
  return (
    <div className="cookie" role="region" aria-label="Hinweis zu Cookies" ref={ref}>
      <Cookie size={20} className="cookie-icon" aria-hidden="true" />
      <p>
        Diese Lernplattform verwendet nur ein technisch notwendiges Cookie für die Anmeldung und speichert deinen
        Lernfortschritt lokal in deinem Browser. Keine Analyse-, Tracking- oder Werbe-Cookies.{' '}
        <Link to="/datenschutz">Datenschutzerklärung</Link>
      </p>
      <button type="button" className="btn btn-primary btn-sm cookie-ok" onClick={() => setSeen(VERSION)}>Verstanden</button>
    </div>
  );
}
