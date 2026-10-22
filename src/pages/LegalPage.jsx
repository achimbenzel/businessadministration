// Impressum and Datenschutzerklärung. Reachable without a session (from the
// login page) and inside the app (sidebar); the texts live in src/legal/.
import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import Logo from '../components/Logo.jsx';
import Impressum, { IMPRESSUM_TITLE } from '../legal/Impressum.jsx';
import Datenschutz, { DATENSCHUTZ_TITLE } from '../legal/Datenschutz.jsx';
import { useAuth } from '../lib/auth.jsx';
import { usePageTitle } from '../lib/pageTitle.js';
import '../styles/legal.css';

export const LEGAL_PAGES = {
  impressum: { path: '/impressum', title: IMPRESSUM_TITLE, Body: Impressum },
  datenschutz: { path: '/datenschutz', title: DATENSCHUTZ_TITLE, Body: Datenschutz },
};

export default function LegalPage({ kind }) {
  const { user } = useAuth();
  const page = LEGAL_PAGES[kind];
  const other = kind === 'impressum' ? LEGAL_PAGES.datenschutz : LEGAL_PAGES.impressum;
  usePageTitle(page.title);
  // Without the app shell nothing resets the scroll position between the two pages.
  useEffect(() => { if (!user) window.scrollTo(0, 0); }, [kind, user]);

  const article = (
    <article className="legal" lang="de">
      <h1>{page.title}</h1>
      <page.Body />
      <nav className="legal-foot" aria-label="Rechtliches">
        <Link to={other.path}>{other.title}</Link>
        {!user && <Link to="/">Zur Anmeldung</Link>}
      </nav>
    </article>
  );
  if (user) return article;
  return (
    <div className="legal-standalone">
      <header className="legal-top">
        <Link to="/" className="legal-back"><ArrowLeft size={17} /> Zur Anmeldung</Link>
        <Logo size={32} />
      </header>
      {article}
    </div>
  );
}
