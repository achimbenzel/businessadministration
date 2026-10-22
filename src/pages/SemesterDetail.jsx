// A semester: its subjects. Admins add subjects and edit the semester here.
import { useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { Plus, Pencil, GraduationCap, ChevronLeft } from 'lucide-react';
import SubjectCard from '../components/SubjectCard.jsx';
import SubjectDialog from '../components/SubjectDialog.jsx';
import SemesterDialog from '../components/SemesterDialog.jsx';
import Empty from '../components/Empty.jsx';
import PageLoader from '../components/PageLoader.jsx';
import { RichText } from '../components/Inline.jsx';
import { useToast } from '../components/Toast.jsx';
import { useConfirm } from '../components/ConfirmDialog.jsx';
import { api } from '../lib/api.js';
import { useAuth } from '../lib/auth.jsx';
import { useCatalog } from '../lib/catalog.jsx';
import { useLearned } from '../lib/progress.js';
import { usePageTitle } from '../lib/pageTitle.js';
import '../styles/catalog.css';

export default function SemesterDetail() {
  const { id } = useParams();
  const { isAdmin } = useAuth();
  const { semesters, reload } = useCatalog();
  const { countIn } = useLearned();
  const [dialog, setDialog] = useState(null); // 'subject' | 'semester'
  const toast = useToast();
  const navigate = useNavigate();
  const { confirm, dialog: confirmDialog } = useConfirm();
  const semester = semesters?.find((s) => s.id === id);
  usePageTitle(semester?.title || 'Semester');

  if (!semesters) return <PageLoader />;
  if (!semester) {
    return <Empty icon={GraduationCap} title="Semester nicht gefunden" action={<Link className="btn" to="/">Zur Übersicht</Link>} />;
  }

  const ids = semester.subjects.flatMap((s) => s.chapterIds);

  const deleteSemester = async () => {
    if (semester.subjects.length) {
      toast('Das Semester enthält noch Fächer. Lösche oder verschiebe sie zuerst.', { kind: 'error' });
      return;
    }
    if (!(await confirm({ title: `„${semester.title}“ löschen?`, message: 'Das leere Semester wird entfernt.', confirmLabel: 'Löschen', danger: true }))) return;
    try {
      await api.deleteSemester(semester.id);
      await reload();
      navigate('/');
      toast('Semester gelöscht', { kind: 'ok' });
    } catch (err) { toast(err.message, { kind: 'error' }); }
  };

  return (
    <div>
      <Link to="/" className="back-link"><ChevronLeft size={16} /> Übersicht</Link>
      <header className="page-head page-head-actions">
        <div>
          <h1>{semester.title}</h1>
          <p>{semester.subjects.length} Fächer{ids.length ? ` · ${countIn(ids)} von ${ids.length} Kapiteln gelernt` : ''}</p>
        </div>
        {isAdmin && (
          <div className="head-actions">
            <button className="btn" onClick={() => setDialog('semester')}><Pencil size={15} /> Bearbeiten</button>
            <button className="btn btn-primary" onClick={() => setDialog('subject')}><Plus size={16} /> Fach</button>
          </div>
        )}
      </header>
      {semester.description && <RichText text={semester.description} className="lead" />}

      {semester.subjects.length ? (
        <div className="subj-grid">
          {semester.subjects.map((s) => <SubjectCard key={s.id} subject={s} learnedCount={countIn(s.chapterIds)} />)}
        </div>
      ) : (
        <Empty icon={GraduationCap} title="Noch keine Fächer"
          action={isAdmin && <button className="btn btn-primary" onClick={() => setDialog('subject')}><Plus size={16} /> Fach anlegen</button>}>
          {isAdmin ? 'Lege das erste Fach dieses Semesters an.' : 'Die Fächer werden bald ergänzt.'}
        </Empty>
      )}

      {dialog === 'subject' && (
        <SubjectDialog semesters={semesters} semesterId={semester.id} onClose={() => setDialog(null)}
          onSave={async (data) => {
            try {
              const s = await api.createSubject(data);
              await reload();
              setDialog(null);
              navigate(`/fach/${s.id}`);
            } catch (err) { toast(err.message, { kind: 'error' }); }
          }} />
      )}
      {dialog === 'semester' && (
        <SemesterDialog semester={semester} onClose={() => setDialog(null)} onDelete={() => { setDialog(null); deleteSemester(); }}
          onSave={async (data) => {
            try {
              await api.updateSemester(semester.id, data);
              await reload();
              setDialog(null);
              toast('Gespeichert', { kind: 'ok' });
            } catch (err) { toast(err.message, { kind: 'error' }); }
          }} />
      )}
      {confirmDialog}
    </div>
  );
}
