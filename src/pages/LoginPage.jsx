// The page without a session: username ("User" or "Admin") and the password
// from .env. Impressum and Datenschutz are linked below the form.
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Eye, EyeOff, LoaderCircle, LogIn, WifiOff } from 'lucide-react';
import Logo from '../components/Logo.jsx';
import { useAuth } from '../lib/auth.jsx';
import { usePageTitle } from '../lib/pageTitle.js';
import '../styles/login.css';

export default function LoginPage() {
  usePageTitle('Anmelden');
  const { login, offline } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      await login(username, password);
    } catch (err) {
      setError(err.message || 'Anmeldung fehlgeschlagen.');
      setBusy(false);
    }
  };

  return (
    <div className="login">
      <div className="login-glow" aria-hidden="true" />
      <form className="login-card" onSubmit={submit} noValidate>
        <div className="login-brand">
          <Logo size={52} />
          <h1>BA Lernplattform</h1>
          <p>Business Administration (M.Sc.) · Hochschule Mainz</p>
        </div>

        {offline && <div className="login-alert"><WifiOff size={16} /> Der Server ist gerade nicht erreichbar.</div>}

        <label className="field">
          <span>Benutzername</span>
          <input className="input" name="username" autoComplete="username" autoCapitalize="none" spellCheck="false"
            value={username} onChange={(e) => setUsername(e.target.value)} placeholder="User oder Admin" required />
        </label>
        <label className="field">
          <span>Passwort</span>
          <div className="input-wrap">
            <input className="input" name="password" type={show ? 'text' : 'password'} autoComplete="current-password"
              value={password} onChange={(e) => setPassword(e.target.value)} required />
            <button type="button" className="input-addon" onClick={() => setShow((s) => !s)}
              aria-label={show ? 'Passwort verbergen' : 'Passwort anzeigen'} title={show ? 'Verbergen' : 'Anzeigen'}>
              {show ? <EyeOff size={17} /> : <Eye size={17} />}
            </button>
          </div>
        </label>

        {error && <div className="login-error" role="alert">{error}</div>}

        <button className="btn btn-primary btn-block" type="submit" disabled={busy || !username.trim() || !password}>
          {busy ? <LoaderCircle size={17} className="spin" /> : <LogIn size={17} />} Anmelden
        </button>
        <p className="login-note">Zugang nur mit Passwort. Betrachter melden sich als <b>User</b> an, Redakteure als <b>Admin</b>.</p>
      </form>
      <nav className="login-legal" aria-label="Rechtliches">
        <Link to="/impressum">Impressum</Link>
        <span aria-hidden="true">·</span>
        <Link to="/datenschutz">Datenschutz</Link>
      </nav>
    </div>
  );
}
