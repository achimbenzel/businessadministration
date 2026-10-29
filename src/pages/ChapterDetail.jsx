// A chapter: read it (everyone) or edit it in place (admin, ?bearbeiten=1).
// Edits save themselves while typing — there's no save button.
// Chapters with content in several sections (Begriffe, Formeln, …) are read
// tab by tab (?tab=formulas) with an overview first and a contents list.
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  ChevronLeft, ChevronRight, Eye, Pencil, Trash2, CircleCheck, Circle, Globe, EyeOff, Check, LoaderCircle,
  CloudOff, TriangleAlert, FolderInput, FileText, Languages,
} from 'lucide-react';
import Menu from '../components/Menu.jsx';
import Modal from '../components/Modal.jsx';
import Empty from '../components/Empty.jsx';
import PageLoader from '../components/PageLoader.jsx';
import AutoTextarea from '../components/AutoTextarea.jsx';
import BlockList from '../components/blocks/BlockList.jsx';
import BlockEditor from '../components/blocks/BlockEditor.jsx';
import { SectionTabs, SectionToc, SectionCards, SectionNav, SECTION_TEXT, useScrollSpy } from '../components/chapter/ChapterSections.jsx';
import { useToast } from '../components/Toast.jsx';
import { api } from '../lib/api.js';
import { useAuth } from '../lib/auth.jsx';
import { useCatalog } from '../lib/catalog.jsx';
import { useLoad } from '../lib/useLoad.js';
import { useSaver } from '../lib/autosave.js';
import { useLearned, rememberChapter } from '../lib/progress.js';
import { usePageTitle } from '../lib/pageTitle.js';
import { subjectStyle } from '../lib/subjects.js';
import { fmtUpdated } from '../lib/format.js';
import { buildSections, resolveSections, SECTIONS, SECTION_KEYS } from '../lib/chapterTabs.js';
import { DESKTOP, useMediaQuery } from '../lib/useMedia.js';
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

  // Sections and the current tab. In the editor the tab bar filters instead (no tab = all blocks).
  const blocks = data?.chapter?.blocks;
  const lang = data?.chapter?.lang || 'de';
  const sections = useMemo(() => buildSections(blocks || [], { lang }), [blocks, lang]);
  const tabParam = params.get('tab');
  const tabbed = sections.tabbed && !editing;
  const section = tabbed ? (sections.list.find((x) => x.key === tabParam) || sections.list[0]) : null;
  const current = section?.key ?? null;
  const filter = editing && SECTION_KEYS.includes(tabParam) ? tabParam : null;
  const wide = useMediaQuery('(min-width: 1320px)');
  const desktop = useMediaQuery(DESKTOP);
  const [tocOpen, setTocOpen] = useState(false);
  const [jump, setJump] = useState(null);
  const tabsAnchor = useRef(null);
  const spyIds = useMemo(() => (section?.items || []).map((i) => i.id), [section]);
  const active = useScrollSpy(tabbed ? spyIds : []);

  useEffect(() => { if (data?.chapter) rememberChapter(data.chapter, data.subject); }, [data?.chapter?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const selectTab = (key) => {
    const p = new URLSearchParams(params);
    if (key && (editing || key !== sections.list[0]?.key)) p.set('tab', key); else p.delete('tab');
    setParams(p, { replace: true });
    // Back to the start of the section once the tab bar has scrolled away.
    const a = tabsAnchor.current;
    if (a) {
      const y = a.getBoundingClientRect().top + window.scrollY - (desktop ? 0 : 56) - 6;
      if (window.scrollY > y) window.scrollTo({ top: y });
    }
  };

  // Go to a block: switch to its tab (or show all in the editor), then scroll there.
  const jumpTo = (id) => {
    const key = sections.of.get(id);
    if (tabbed && key && key !== current) selectTab(key);
    if (editing && filter) {
      const i = (blocks || []).findIndex((b) => b.id === id);
      if (i >= 0 && resolveSections(blocks)[i] !== filter) selectTab(null);
    }
    setTocOpen(false);
    setJump({ id });
  };
  useEffect(() => {
    if (!jump) return undefined;
    const el = document.getElementById(`b-${jump.id}`);
    if (!el) return undefined;
    setJump(null);
    el.scrollIntoView({ block: 'start', behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
    el.classList.add('flash');
    const t = setTimeout(() => el.classList.remove('flash'), 1800);
    return () => clearTimeout(t);
  }, [jump, current, filter]);

  // Search results link to a block (#b-<id>).
  useEffect(() => {
    if (data && location.hash.startsWith('#b-')) jumpTo(location.hash.slice(3));
  }, [data?.chapter?.id, location.hash]); // eslint-disable-line react-hooks/exhaustive-deps

  const save = async (opts = {}) => {
    const c = chapterRef.current;
    if (!c) return;
    const seq = editSeq.current;
    setSaveState('saving');
    try {
      const saved = await api.updateChapter(c.id, {
        title: c.title, summary: c.summary, status: c.status, lang: c.lang, blocks: c.blocks, baseRev: revRef.current,
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
  const T = SECTION_TEXT[lang] || SECTION_TEXT.de;
  const last = sections.list[sections.list.length - 1];
  // Editor: "Alle" plus every section, with the number of blocks in it.
  const editTabs = editing && chapter.blocks.length > 0 && (() => {
    const keys = resolveSections(chapter.blocks);
    return [
      { key: null, label: 'Alle', color: 'blue', count: chapter.blocks.length },
      ...SECTIONS.map((x) => ({ key: x.key, label: x.label.de, color: x.color, count: keys.filter((k) => k === x.key).length })),
    ];
  })();

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
    <article className={`chapter ${editing ? 'is-editing' : ''} ${tabbed ? 'is-tabbed' : ''}`} style={subjectStyle(subject)}>
      <div className="ch-main">
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
            {chapter.lang === 'en' && <span className="chip-static" title="Inhalt auf Englisch">EN</span>}
            <SaveIndicator state={saveState} updatedAt={chapter.updatedAt} />
            <Menu label="Kapitel-Aktionen" items={[
              {
                label: chapter.lang === 'en' ? 'Inhalt auf Deutsch umstellen' : 'Inhalt auf Englisch umstellen',
                hint: chapter.lang === 'en' ? 'jetzt: EN' : 'jetzt: DE',
                icon: Languages,
                onClick: () => edit({ lang: chapter.lang === 'en' ? 'de' : 'en' }, { immediate: true }),
              },
              { label: 'In anderes Fach verschieben', icon: FolderInput, onClick: () => { saver.flush(); setMoving(true); } },
              '-',
              { label: 'Kapitel löschen', icon: Trash2, danger: true, onClick: remove },
            ]} />
          </div>
        )}

        <header className="chapter-head" lang={chapter.lang}>
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

        <div ref={tabsAnchor} />
        {tabbed && (
          <SectionTabs tabs={sections.list} current={current} onSelect={selectTab} lang={lang}
            onContents={wide ? null : () => setTocOpen(true)} />
        )}
        {editTabs && <SectionTabs tabs={editTabs} current={filter} onSelect={selectTab} lang="de" sticky={false} />}

        {editing ? (
          <BlockEditor blocks={chapter.blocks} chapterId={chapter.id} lang={chapter.lang} filter={filter} onChange={(blocks) => edit({ blocks })} />
        ) : tabbed ? (
          <div className="ch-panel" role="tabpanel" aria-label={section.label} key={current}>
            {current === 'overview' ? (
              // The map of the chapter comes right after the introduction (the first overview block).
              <>
                {section.blocks.length > 0 && <BlockList blocks={section.blocks.slice(0, 1)} chapterId={chapter.id} lang={chapter.lang} />}
                <SectionCards sections={sections.list} onSelect={selectTab} lang={lang} />
                {section.blocks.length > 1 && <BlockList blocks={section.blocks.slice(1)} chapterId={chapter.id} lang={chapter.lang} />}
              </>
            ) : <BlockList blocks={section.blocks} chapterId={chapter.id} lang={chapter.lang} />}
            {current !== 'overview' && <SectionNav sections={sections.list} current={current} onSelect={selectTab} lang={lang} />}
          </div>
        ) : (
          <BlockList blocks={chapter.blocks} chapterId={chapter.id} lang={chapter.lang} emptyHint={isAdmin ? <button className="btn" onClick={() => setEditing(true)}><Pencil size={15} /> Inhalte hinzufügen</button> : null} />
        )}

        {!editing && (!tabbed || current === last.key) && (
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
      </div>

      {tabbed && wide && (
        <aside className="ch-toc">
          <div className="ch-toc-label">{T.contents}</div>
          <SectionToc sections={sections.list} current={current} active={active} onSelect={selectTab} onJump={jumpTo} lang={lang} />
        </aside>
      )}
      {tocOpen && (
        <Modal title={T.contents} onClose={() => setTocOpen(false)} size="sm" className="ch-toc-modal">
          <SectionToc sections={sections.list} current={current} active={active} onSelect={(k) => { setTocOpen(false); selectTab(k); }}
            onJump={jumpTo} lang={lang} expandAll />
        </Modal>
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
  return <span className="save-state ok" title={`Zuletzt geändert: ${fmtUpdated(updatedAt)}`}><Check size={14} /> Gespeichert</span>;
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
