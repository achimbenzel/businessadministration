// Start page: continue learning, the semesters with their subjects, recent changes.
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, BookOpen, Clock, Plus, Settings2, GraduationCap } from 'lucide-react';
import SubjectCard from '../components/SubjectCard.jsx';
import SubjectIcon from '../components/SubjectIcon.jsx';
import SemesterDialog from '../components/SemesterDialog.jsx';
import Empty from '../components/Empty.jsx';
import PageLoader from '../components/PageLoader.jsx';
import { useToast } from '../components/Toast.jsx';
import { api } from '../lib/api.js';
import { useAuth } from '../lib/auth.jsx';
import { useCatalog } from '../lib/catalog.jsx';
import { useLoad } from '../lib/useLoad.js';
import { useLastChapter, useLearned } from '../lib/progress.js';
import { usePageTitle } from '../lib/pageTitle.js';
import { fmtRelative } from '../lib/format.js';
import '../styles/catalog.css';

export default function HomePage() {
  usePageTitle('Übersicht');
  const { isAdmin } = useAuth();
  const { semesters, error, reload } = useCatalog();
  const { countIn } = useLearned();
  const [last] = useLastChapter();
  const recent = useLoad(() => api.recentChapters(5), []);
  const [newSemester, setNewSemester] = useState(false);
  const toast = useToast();

  if (error && !semesters) return <Empty icon={BookOpen} title="Inhalte konnten nicht geladen werden">{error.message}</Empty>;
  if (!semesters) return <PageLoader />;

  const allSubjects = semesters.flatMap((s) => s.subjects);
  const allIds = allSubjects.flatMap((s) => s.chapterIds);
  const learned = countIn(allIds);

  return (
    <div className="home">
      <header className="page-head home-head">
        <div>
          <p className="eyebrow">Hochschule Mainz · Business Administration (M.Sc.)</p>
          <h1>Willkommen zurück</h1>
          <p>{allIds.length ? `${learned} von ${allIds.length} Kapiteln gelernt.` : 'Hier findest du alle Lerninhalte – sortiert nach Semester und Fach.'}</p>
        </div>
      </header>

      {last && (
        <Link to={`/kapitel/${last.id}`} className="continue-card">
          {last.subject ? <SubjectIcon subject={last.subject} size={44} /> : <span className="continue-icon"><BookOpen size={20} /></span>}
          <span className="continue-text">
            <small>Weiterlernen</small>
            <strong>{last.title}</strong>
            {last.subject && <span>{last.subject.title}</span>}
          </span>
          <ArrowRight size={20} className="continue-arrow" />
        </Link>
      )}

      {semesters.length === 0 && (
        <Empty icon={GraduationCap} title="Noch keine Semester"
          action={isAdmin && <button className="btn btn-primary" onClick={() => setNewSemester(true)}><Plus size={16} /> Semester anlegen</button>}>
          {isAdmin ? 'Lege das erste Semester an.' : 'Die Inhalte werden bald ergänzt.'}
        </Empty>
      )}

      {semesters.map((sem) => {
        const ids = sem.subjects.flatMap((s) => s.chapterIds);
        return (
          <section key={sem.id} className="section">
            <div className="section-head">
              <h2><Link to={`/semester/${sem.id}`}>{sem.title}</Link></h2>
              <span className="section-meta">{sem.subjects.length} Fächer{ids.length ? ` · ${countIn(ids)}/${ids.length} gelernt` : ''}</span>
              <Link to={`/semester/${sem.id}`} className="btn btn-ghost btn-sm section-link">
                {isAdmin ? <><Settings2 size={15} /> Verwalten</> : <>Alle <ArrowRight size={15} /></>}
              </Link>
            </div>
            <div className="subj-grid">
              {sem.subjects.map((s) => <SubjectCard key={s.id} subject={s} learnedCount={countIn(s.chapterIds)} />)}
            </div>
          </section>
        );
      })}

      {isAdmin && semesters.length > 0 && (
        <button className="add-row" onClick={() => setNewSemester(true)}><Plus size={17} /> Semester hinzufügen</button>
      )}

      {recent.data?.length > 0 && (
        <section className="section">
          <div className="section-head"><h2>Zuletzt aktualisiert</h2></div>
          <div className="row-list">
            {recent.data.map((c) => (
              <Link key={c.id} to={`/kapitel/${c.id}`} className="row-item">
                <SubjectIcon subject={c.subject} size={34} />
                <span className="row-text">
                  <strong>{c.title}</strong>
                  <small>{c.subject?.title}</small>
                </span>
                {c.status === 'draft' && <span className="badge badge-draft">Entwurf</span>}
                <span className="row-meta"><Clock size={13} /> {fmtRelative(c.updatedAt)}</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {newSemester && (
        <SemesterDialog nextNumber={Math.max(0, ...semesters.map((s) => s.number)) + 1} onClose={() => setNewSemester(false)}
          onSave={async (data) => {
            try {
              await api.createSemester(data);
              await reload();
              setNewSemester(false);
              toast('Semester angelegt', { kind: 'ok' });
            } catch (err) { toast(err.message, { kind: 'error' }); }
          }} />
      )}
    </div>
  );
}
