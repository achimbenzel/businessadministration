// Navigation: docked on desktop (264 px, or a 64 px icon rail when collapsed),
// a drawer below 900 px. Semesters with their subjects, search, trash (admin),
// and who is signed in.
import { NavLink } from 'react-router-dom';
import { House, Search, Trash2, LogOut, PanelLeftClose, PanelLeftOpen, ShieldCheck, Eye, GraduationCap } from 'lucide-react';
import Logo from './Logo.jsx';
import SubjectIcon from './SubjectIcon.jsx';
import { useAuth } from '../lib/auth.jsx';
import { useCatalog } from '../lib/catalog.jsx';

export default function Sidebar({ collapsed, onToggleCollapsed, onSearch, onNavigate, desktop }) {
  const { user, isAdmin, logout } = useAuth();
  const { semesters } = useCatalog();
  const rail = desktop && collapsed;
  const link = ({ isActive }) => `side-link ${isActive ? 'active' : ''}`;

  return (
    <aside className="sidebar" aria-label="Navigation">
      <div className="side-head">
        <NavLink to="/" className="side-brand" onClick={onNavigate} title="Übersicht">
          <Logo size={34} />
          <span className="side-brand-text">
            <strong>BA Lernplattform</strong>
            <small>Hochschule Mainz · M.Sc.</small>
          </span>
        </NavLink>
        {desktop && (
          <button className="icon-btn icon-btn-ghost side-collapse" onClick={onToggleCollapsed}
            aria-label={collapsed ? 'Seitenleiste ausklappen' : 'Seitenleiste einklappen'} title={collapsed ? 'Ausklappen' : 'Einklappen'}>
            {collapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
          </button>
        )}
      </div>

      <button className="side-search" onClick={onSearch} title="Suchen (Strg+K)">
        <Search size={17} /><span className="side-label">Suchen</span><kbd className="side-kbd">⌘K</kbd>
      </button>

      <nav className="side-nav">
        <NavLink to="/" end className={link} onClick={onNavigate} title="Übersicht">
          <House size={18} /><span className="side-label">Übersicht</span>
        </NavLink>

        {(semesters || []).map((sem) => (
          <div className="side-group" key={sem.id}>
            <NavLink to={`/semester/${sem.id}`} className={({ isActive }) => `side-group-head ${isActive ? 'active' : ''}`} onClick={onNavigate} title={sem.title}>
              {rail ? <GraduationCap size={18} /> : <span className="side-label">{sem.title}</span>}
            </NavLink>
            {sem.subjects.map((s) => (
              <NavLink key={s.id} to={`/fach/${s.id}`} className={link} onClick={onNavigate} title={s.title}>
                <SubjectIcon subject={s} size={rail ? 30 : 26} />
                <span className="side-label">{s.title}</span>
              </NavLink>
            ))}
          </div>
        ))}

        {isAdmin && (
          <div className="side-group">
            {!rail && <div className="side-group-head side-group-static"><span className="side-label">Verwaltung</span></div>}
            <NavLink to="/papierkorb" className={link} onClick={onNavigate} title="Papierkorb">
              <Trash2 size={18} /><span className="side-label">Papierkorb</span>
            </NavLink>
          </div>
        )}
      </nav>

      <div className="side-foot">
        <div className="side-user" title={isAdmin ? 'Admin – darf Inhalte bearbeiten' : 'Betrachter – nur lesen'}>
          <span className={`side-role ${isAdmin ? 'admin' : ''}`}>{isAdmin ? <ShieldCheck size={16} /> : <Eye size={16} />}</span>
          <span className="side-label side-user-text">
            <strong>{user?.username}</strong>
            <small>{isAdmin ? 'Admin' : 'Betrachter'}</small>
          </span>
        </div>
        <button className="icon-btn icon-btn-ghost" onClick={logout} aria-label="Abmelden" title="Abmelden"><LogOut size={17} /></button>
      </div>
    </aside>
  );
}
