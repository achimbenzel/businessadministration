// A chapter: read it (everyone) or edit it in place (admin, ?bearbeiten=1).
// Edits save themselves while typing — there's no save button.
import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  ChevronLeft, ChevronRight, Eye, Pencil, Trash2, CircleCheck, Circle, Globe, EyeOff, Check, LoaderCircle,
  CloudOff, TriangleAlert, FolderInput, FileText,
} from 'lucide-react';
import Menu from '../components/Menu.jsx';
import Modal from '../components/Modal.jsx';
import Empty from '../components/Empty.jsx';
import PageLoader from '../components/PageLoader.jsx';
import AutoTextarea from '../components/AutoTextarea.jsx';
import BlockList from '../components/blocks/BlockList.jsx';
import BlockEditor from '../components/blocks/BlockEditor.jsx';
import { useToast } from '../components/Toast.jsx';
import { api } from '../lib/api.js';
import { useAuth } from '../lib/auth.jsx';
import { useCatalog } from '../lib/catalog.jsx';
import { useLoad } from '../lib/useLoad.js';
import { useSaver } from '../lib/autosave.js';
import { useLearned, rememberChapter } from '../lib/progress.js';
import { usePageTitle } from '../lib/pageTitle.js';
import { subjectStyle } from '../lib/subjects.js';
import { fmtRelative } from '../lib/format.js';
import '../styles/chapter.css';
import '../styles/blocks.css';

export default function ChapterDetail() {
  const { id } = useParams();
  const { isAdmin } = useAuth();
  const catalog = useCatalog();
  const [params, setParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const toast = useToast();
  const editing = isAdmin && params.get('bearbeiten') === '1';

  // The chapter as edited locally, and the revision the next save is based on.
  const chapterRef = useRef(null);
  const revRef = useRef(0);
  const editSeq = useRef(0);
  const { data, error, setData, reload } = useLoad(async () => {
    const d = await api.chapter(id);
    chapterRef.current = d.chapter;
    revRef.current = d.chapter.rev;
    return d;
  }, [id]);
  const saver = useSaver(700);
  const [saveState, setSaveState] = useState('saved'); // saved | dirty | saving | error | conflict
  const [moving, setMoving] = useState(false);
  const { isLearned, toggle } = useLearned();
  usePageTitle(data?.chapter?.title || 'Kapitel');

  useEffect(() => { if (data?.chapter) rememberChapter(data.chapter, data.subject); }, [data?.chapter?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Search results link to a block (#b-<id>): scroll there and highlight it.
  useEffect(() => {
    if (!data || !location.hash.startsWith('#b-')) return;
    const el = document.getElementById(location.hash.slice(1));
    if (!el) return;
    el.scrollIntoView({ block: 'center' });
    el.classList.add('flash');
    const t = setTimeout(() => el.classList.remove('flash'), 1800);
    return () => clearTimeout(t);
  }, [data, location.hash]);

  const save = async (opts = {}) => {
    const c = chapterRef.current;
    if (!c) return;
    const seq = editSeq.current;
    setSaveState('saving');
    try {
      const saved = await api.updateChapter(c.id, {
        title: c.title, summary: c.summary, status: c.status, blocks: c.blocks, baseRev: revRef.current,
      }, { keepalive: opts.keepalive });
      revRef.current = saved.rev;
      // Only the revision is taken over — the text stays as typed (the server
      // trims titles, which would eat a space typed a moment ago).
      if (seq === editSeq.current) setSaveState('saved');
      setData((d) => (d ? { ...d, chapter: { ...d.chapter, rev: saved.rev, updatedAt: saved.updatedAt } } : d));
    } catch (err) {
      if (err.status === 409) {
        setSaveState('conflict');
        saver.cancel();
        toast('Dieses Kapitel wurde an anderer Stelle geändert. Lade es neu, um weiterzuarbeiten.', {
          kind: 'error', duration: 0, action: { label: 'Neu laden', onClick: () => { setSaveState('saved'); reload(); } },
        });
      } else {
        setSaveState('error');
        toast(`Nicht gespeichert: ${err.message}`, { kind: 'error' });
      }
    }
  };

  const edit = (patch, { immediate = false } = {}) => {
    if (saveState === 'conflict') return;
    const next = { ...chapterRef.current, ...patch };
    chapterRef.current = next;
    editSeq.current += 1;
    setData((d) => ({ ...d, chapter: next }));
    setSaveState('dirty');
    saver.schedule('chapter', save, { immediate });
  };

  const setEditing = (on) => {
    if (!on) saver.flush();
    const p = new URLSearchParams(params);
    if (on) p.set('bearbeiten', '1'); else p.delete('bearbeiten');
    setParams(p, { replace: true });
  };

  if (error) {
    return <Empty icon={FileText} title={error.status === 404 ? 'Kapitel nicht gefunden' : 'Kapitel konnte nicht geladen werden'}
      action={<Link className="btn" to="/">Zur Übersicht</Link>}>
      {error.status === 404 ? 'Vielleicht wurde es gelöscht oder ist noch nicht veröffentlicht.' : error.message}
    </Empty>;
  }
  if (!data) return <PageLoader />;
  const { chapter, subject, semester, prev, next, position, total } = data;
  const learned = isLearned(chapter.id);

  const remove = async () => {
    saver.cancel();
    try {
      const trashId = await api.deleteChapter(chapter.id);
      catalog.reload();
      navigate(subject ? `/fach/${subject.id}` : '/');
      toast(`„${chapter.title}“ gelöscht`, {
        action: {
          label: 'Rückgängig',
          onClick: async () => {
            try { await api.restoreTrash(trashId); catalog.reload(); navigate(`/kapitel/${chapter.id}`); } catch (err) { toast(err.message, { kind: 'error' }); }
          },
        },
      });
    } catch (err) { toast(err.message, { kind: 'error' }); }
  };

  return (
    <article className={`chapter ${editing ? 'is-editing' : ''}`} style={subjectStyle(subject)}>
      <nav className="crumbs" aria-label="Pfad">
        {semester && <Link to={`/semester/${semester.id}`}>{semester.title}</Link>}
        {semester && subject && <ChevronRight size={14} />}
        {subject && <Link to={`/fach/${subject.id}`}>{subject.short || subject.title}</Link>}
        {total > 0 && <span className="crumbs-pos">Kapitel {position} von {total}</span>}
      </nav>

      {isAdmin && (
        <div className="admin-bar">
          <div className="segmented" role="tablist" aria-label="Modus">
            <button role="tab" aria-selected={!editing} className={!editing ? 'on' : ''} onClick={() => setEditing(false)}><Eye size={15} /> Ansehen</button>
            <button role="tab" aria-selected={editing} className={editing ? 'on' : ''} onClick={() => setEditing(true)}><Pencil size={15} /> Bearbeiten</button>
          </div>
          <button className={`status-btn ${chapter.status}`} onClick={() => edit({ status: chapter.status === 'published' ? 'draft' : 'published' }, { immediate: true })}
            title={chapter.status === 'published' ? 'Für Betrachter sichtbar – klicken, um es zum Entwurf zu machen' : 'Nur für Admins sichtbar – klicken, um es zu veröffentlichen'}>
            {chapter.status === 'published' ? <><Globe size={15} /> Veröffentlicht</> : <><EyeOff size={15} /> Entwurf</>}
          </button>
          <SaveIndicator state={saveState} updatedAt={chapter.updatedAt} />
          <Menu label="Kapitel-Aktionen" items={[
            { label: 'In anderes Fach verschieben', icon: FolderInput, onClick: () => { saver.flush(); setMoving(true); } },
            '-',
            { label: 'Kapitel löschen', icon: Trash2, danger: true, onClick: remove },
          ]} />
        </div>
      )}

      <header className="chapter-head">
        {editing ? (
          <>
            <AutoTextarea className="chapter-title-input" value={chapter.title} onChange={(e) => edit({ title: e.target.value.replace(/\n/g, ' ') })}
              placeholder="Titel des Kapitels" aria-label="Titel" maxLength={200} />
            <AutoTextarea className="chapter-summary-input" value={chapter.summary} onChange={(e) => edit({ summary: e.target.value })}
              placeholder="Kurze Zusammenfassung (optional) – erscheint in der Kapitelliste" aria-label="Zusammenfassung" maxLength={1000} />
          </>
        ) : (
          <>
            <h1>{chapter.title}</h1>
            {chapter.summary && <p className="chapter-summary">{chapter.summary}</p>}
          </>
        )}
      </header>

      {editing
        ? <BlockEditor blocks={chapter.blocks} chapterId={chapter.id} onChange={(blocks) => edit({ blocks })} />
        : <BlockList blocks={chapter.blocks} chapterId={chapter.id} emptyHint={isAdmin ? <button className="btn" onClick={() => setEditing(true)}><Pencil size={15} /> Inhalte hinzufügen</button> : null} />}

      {!editing && (
        <footer className="chapter-foot">
          <button className={`learned-btn ${learned ? 'on' : ''}`} onClick={() => toggle(chapter.id)} aria-pressed={learned}>
            {learned ? <CircleCheck size={20} /> : <Circle size={20} />}
            {learned ? 'Gelernt' : 'Als gelernt markieren'}
          </button>
          <div className="chapter-nav">
            {prev ? (
              <Link to={`/kapitel/${prev.id}`} className="nav-card prev"><ChevronLeft size={18} /><span><small>Vorheriges</small>{prev.title}</span></Link>
            ) : <span />}
            {next ? (
              <Link to={`/kapitel/${next.id}`} className="nav-card next"><span><small>Nächstes</small>{next.title}</span><ChevronRight size={18} /></Link>
            ) : subject && (
              <Link to={`/fach/${subject.id}`} className="nav-card next"><span><small>Fertig</small>Zurück zum Fach</span><ChevronRight size={18} /></Link>
            )}
          </div>
        </footer>
      )}

      {moving && (
        <MoveDialog chapter={chapter} semesters={catalog.semesters || []} onClose={() => setMoving(false)} onMove={async (subjectId) => {
          try {
            await api.updateChapter(chapter.id, { subjectId, baseRev: revRef.current });
            setMoving(false);
            catalog.reload();
            await reload();
            toast('Kapitel verschoben', { kind: 'ok' });
          } catch (err) { toast(err.message, { kind: 'error' }); }
        }} />
      )}
    </article>
  );
}

function SaveIndicator({ state, updatedAt }) {
  if (state === 'saving' || state === 'dirty') return <span className="save-state"><LoaderCircle size={14} className="spin" /> Speichert …</span>;
  if (state === 'error') return <span className="save-state bad"><CloudOff size={14} /> Nicht gespeichert</span>;
  if (state === 'conflict') return <span className="save-state bad"><TriangleAlert size={14} /> Konflikt</span>;
  return <span className="save-state ok" title={`Zuletzt geändert ${fmtRelative(updatedAt)}`}><Check size={14} /> Gespeichert</span>;
}

function MoveDialog({ chapter, semesters, onClose, onMove }) {
  const [target, setTarget] = useState(chapter.subjectId);
  return (
    <Modal title="In anderes Fach verschieben" onClose={onClose} size="sm"
      footer={(
        <>
          <button className="btn btn-ghost" onClick={onClose}>Abbrechen</button>
          <button className="btn btn-primary" disabled={target === chapter.subjectId} onClick={() => onMove(target)}>Verschieben</button>
        </>
      )}>
      <label className="field">
        <span>Fach</span>
        <select className="input" value={target} onChange={(e) => setTarget(e.target.value)}>
          {semesters.map((sem) => (
            <optgroup key={sem.id} label={sem.title}>
              {sem.subjects.map((s) => <option key={s.id} value={s.id}>{s.title}</option>)}
            </optgroup>
          ))}
        </select>
      </label>
    </Modal>
  );
}
