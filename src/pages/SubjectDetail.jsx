// A subject: description, progress and its chapters. Admins create, reorder
// and open chapters for editing here, and edit the subject itself.
import { useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ChevronLeft, Plus, Layers, Pencil, Trash2, CircleCheck, Circle, GripVertical, FileText, CircleHelp, BookOpen,
} from 'lucide-react';
import SubjectIcon from '../components/SubjectIcon.jsx';
import SubjectDialog from '../components/SubjectDialog.jsx';
import Modal from '../components/Modal.jsx';
import Menu from '../components/Menu.jsx';
import Empty from '../components/Empty.jsx';
import PageLoader from '../components/PageLoader.jsx';
import { RichText } from '../components/Inline.jsx';
import { useToast } from '../components/Toast.jsx';
import { useConfirm } from '../components/ConfirmDialog.jsx';
import { api } from '../lib/api.js';
import { useAuth } from '../lib/auth.jsx';
import { useCatalog } from '../lib/catalog.jsx';
import { useLoad } from '../lib/useLoad.js';
import { useLearned } from '../lib/progress.js';
import { usePageTitle } from '../lib/pageTitle.js';
import { subjectStyle } from '../lib/subjects.js';
import { useSortable, moveItem } from '../lib/useSortable.js';
import { plural } from '../lib/format.js';
import '../styles/catalog.css';

export default function SubjectDetail() {
  const { id } = useParams();
  const { isAdmin } = useAuth();
  const catalog = useCatalog();
  const { data, error, setData, reload } = useLoad(() => api.subject(id), [id]);
  const { isLearned, toggle, countIn } = useLearned();
  const [dialog, setDialog] = useState(null); // 'edit' | 'chapter'
  const toast = useToast();
  const navigate = useNavigate();
  const { confirm, dialog: confirmDialog } = useConfirm();
  const listRef = useRef(null);
  usePageTitle(data?.subject?.title || 'Fach');

  const chapters = data?.chapters || [];
  const ids = chapters.map((c) => c.id);
  const { grab, itemState } = useSortable({
    ids,
    container: listRef,
    onMove: async (from, to) => {
      const next = moveItem(chapters, from, to);
      setData((d) => ({ ...d, chapters: next }));
      try { await api.orderChapters(id, next.map((c) => c.id)); } catch (err) { toast(err.message, { kind: 'error' }); reload(); }
    },
  });

  if (error) {
    return <Empty icon={BookOpen} title={error.status === 404 ? 'Fach nicht gefunden' : 'Fach konnte nicht geladen werden'}
      action={<Link className="btn" to="/">Zur Übersicht</Link>}>{error.status === 404 ? null : error.message}</Empty>;
  }
  if (!data) return <PageLoader />;
  const { subject, semester } = data;
  const learned = countIn(ids);
  const cardCount = chapters.reduce((n, c) => n + c.cards, 0);
  const pct = ids.length ? Math.round((learned / ids.length) * 100) : 0;

  const deleteSubject = async () => {
    if (chapters.length) { toast('Das Fach enthält noch Kapitel. Lösche sie zuerst.', { kind: 'error' }); return; }
    if (!(await confirm({ title: `„${subject.title}“ löschen?`, message: 'Das leere Fach wird entfernt.', confirmLabel: 'Löschen', danger: true }))) return;
    try {
      await api.deleteSubject(subject.id);
      await catalog.reload();
      navigate(semester ? `/semester/${semester.id}` : '/');
      toast('Fach gelöscht', { kind: 'ok' });
    } catch (err) { toast(err.message, { kind: 'error' }); }
  };

  return (
    <div className="subject" style={subjectStyle(subject)}>
      {semester && <Link to={`/semester/${semester.id}`} className="back-link"><ChevronLeft size={16} /> {semester.title}</Link>}
      <header className="subject-head">
        <SubjectIcon subject={subject} size={56} className="subject-head-icon" />
        <div className="subject-head-text">
          <div className="subject-chips">
            {subject.short && <span className="chip-static tinted">{subject.short}</span>}
            {subject.ects != null && <span className="chip-static">{subject.ects} ECTS</span>}
          </div>
          <h1>{subject.title}</h1>
        </div>
        {isAdmin && (
          <Menu label="Fach-Aktionen" items={[
            { label: 'Fach bearbeiten', icon: Pencil, onClick: () => setDialog('edit') },
            '-',
            { label: 'Fach löschen', icon: Trash2, danger: true, onClick: deleteSubject },
          ]} />
        )}
      </header>

      {subject.description
        ? <RichText text={subject.description} className="lead" />
        : isAdmin && <button className="lead-placeholder" onClick={() => setDialog('edit')}><Pencil size={14} /> Beschreibung hinzufügen …</button>}

      <div className="subject-bar">
        <div className="subject-progress">
          <div className="progress progress-lg"><span style={{ width: `${pct}%` }} /></div>
          <span className="subject-progress-text">{ids.length ? `${learned} / ${ids.length} gelernt` : 'Noch keine Kapitel'}</span>
        </div>
        <div className="head-actions">
          {cardCount > 0 && (
            <Link to={`/fach/${subject.id}/karteikarten`} className="btn"><Layers size={16} /> Karteikarten <span className="count">{cardCount}</span></Link>
          )}
          {isAdmin && <button className="btn btn-primary" onClick={() => setDialog('chapter')}><Plus size={16} /> Kapitel</button>}
        </div>
      </div>

      {chapters.length ? (
        <ol className="chapter-list" ref={listRef}>
          {chapters.map((c, i) => {
            const st = itemState(c.id);
            const done = isLearned(c.id);
            return (
              <li key={c.id} data-sort-id={c.id} className={`chapter-row ${done ? 'done' : ''} ${st.className}`} style={st.style}>
                {isAdmin && chapters.length > 1 && (
                  <button className="chapter-grip" aria-label="Verschieben" title="Ziehen zum Sortieren" {...grab(c.id)}><GripVertical size={16} /></button>
                )}
                <Link to={`/kapitel/${c.id}`} className="chapter-link">
                  <span className="chapter-num">{i + 1}</span>
                  <span className="chapter-text">
                    <strong>{c.title}</strong>
                    {c.summary && <small>{c.summary}</small>}
                    <span className="chapter-meta">
                      {c.status === 'draft' && <span className="badge badge-draft">Entwurf</span>}
                      {c.cards > 0 && <span><Layers size={12} /> {plural(c.cards, 'Karte', 'Karten')}</span>}
                      {c.quizzes > 0 && <span><CircleHelp size={12} /> {plural(c.quizzes, 'Frage', 'Fragen')}</span>}
                    </span>
                  </span>
                </Link>
                <button className={`chapter-check ${done ? 'on' : ''}`} onClick={() => toggle(c.id)}
                  aria-pressed={done} aria-label={done ? 'Als nicht gelernt markieren' : 'Als gelernt markieren'} title={done ? 'Gelernt' : 'Als gelernt markieren'}>
                  {done ? <CircleCheck size={22} /> : <Circle size={22} />}
                </button>
              </li>
            );
          })}
        </ol>
      ) : (
        <Empty icon={FileText} title="Noch keine Kapitel"
          action={isAdmin && <button className="btn btn-primary" onClick={() => setDialog('chapter')}><Plus size={16} /> Erstes Kapitel anlegen</button>}>
          {isAdmin ? 'Kapitel bestehen aus Bausteinen – Text, Definitionen, Karteikarten, Quizfragen und mehr.' : 'Die Inhalte für dieses Fach werden bald ergänzt.'}
        </Empty>
      )}

      {dialog === 'edit' && (
        <SubjectDialog subject={subject} semesters={catalog.semesters} onClose={() => setDialog(null)}
          onDelete={() => { setDialog(null); deleteSubject(); }}
          onSave={async (patch) => {
            try {
              const s = await api.updateSubject(subject.id, patch);
              setData((d) => ({ ...d, subject: s }));
              catalog.reload();
              setDialog(null);
              toast('Gespeichert', { kind: 'ok' });
              if (s.semesterId !== semester?.id) reload();
            } catch (err) { toast(err.message, { kind: 'error' }); }
          }} />
      )}
      {dialog === 'chapter' && (
        <NewChapterDialog onClose={() => setDialog(null)} onCreate={async (title) => {
          try {
            const c = await api.createChapter({ subjectId: subject.id, title });
            catalog.reload();
            navigate(`/kapitel/${c.id}?bearbeiten=1`);
          } catch (err) { toast(err.message, { kind: 'error' }); }
        }} />
      )}
      {confirmDialog}
    </div>
  );
}

function NewChapterDialog({ onClose, onCreate }) {
  const [title, setTitle] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async (e) => {
    e.preventDefault();
    if (!title.trim() || busy) return;
    setBusy(true);
    await onCreate(title.trim());
    setBusy(false);
  };
  return (
    <Modal title="Neues Kapitel" onClose={onClose} size="sm"
      footer={(
        <>
          <button type="button" className="btn btn-ghost" onClick={onClose}>Abbrechen</button>
          <button type="submit" form="chapter-form" className="btn btn-primary" disabled={!title.trim() || busy}>Anlegen</button>
        </>
      )}>
      <form id="chapter-form" className="form" onSubmit={submit}>
        <label className="field">
          <span>Titel</span>
          <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="z. B. Grundbegriffe der Kostenrechnung" maxLength={200} />
        </label>
        <p className="form-note">Neue Kapitel sind zunächst ein Entwurf – nur Admins sehen sie, bis du sie veröffentlichst.</p>
      </form>
    </Modal>
  );
}
