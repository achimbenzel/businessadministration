// Practise a subject's flashcards: flip, then "Gewusst" or "Nochmal".
// Known cards are remembered on this device; a round can skip them.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ChevronLeft, Layers, Shuffle, Check, RotateCcw, X, PartyPopper, Undo2 } from 'lucide-react';
import Empty from '../components/Empty.jsx';
import PageLoader from '../components/PageLoader.jsx';
import { RichText } from '../components/Inline.jsx';
import { api } from '../lib/api.js';
import { useLoad } from '../lib/useLoad.js';
import { useKnownCards } from '../lib/progress.js';
import { usePageTitle } from '../lib/pageTitle.js';
import { subjectStyle } from '../lib/subjects.js';
import '../styles/study.css';
import '../styles/blocks.css';

const shuffle = (list) => {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i -= 1) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
};

export default function FlashcardsPage() {
  const { id } = useParams();
  const { data, error } = useLoad(() => api.cards(id), [id]);
  const [known, setKnown] = useKnownCards();
  const [onlyOpen, setOnlyOpen] = useState(true);
  const [deck, setDeck] = useState(null);   // ids in the current round
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [round, setRound] = useState({ right: 0, again: [] });
  const [history, setHistory] = useState([]);
  usePageTitle(data ? `Karteikarten · ${data.subject.short || data.subject.title}` : 'Karteikarten');

  const cards = useMemo(() => new Map((data?.cards || []).map((c) => [c.id, c])), [data]);

  const start = useCallback((ids, { mix = false } = {}) => {
    setDeck(mix ? shuffle(ids) : ids);
    setIndex(0); setFlipped(false); setRound({ right: 0, again: [] }); setHistory([]);
  }, []);

  // A new round whenever the cards load or the "only open cards" switch changes.
  useEffect(() => {
    if (!data) return;
    const all = data.cards.map((c) => c.id);
    const open = all.filter((cid) => !known[cid]);
    start(onlyOpen && open.length ? open : all);
  }, [data, onlyOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  const answer = useCallback((knewIt) => {
    if (!deck || index >= deck.length) return;
    const cid = deck[index];
    setKnown((cur) => {
      const next = { ...cur };
      if (knewIt) next[cid] = Date.now(); else delete next[cid];
      return next;
    });
    setRound((r) => (knewIt ? { ...r, right: r.right + 1 } : { ...r, again: [...r.again, cid] }));
    setHistory((h) => [...h, { cid, knewIt, prev: known[cid] }]);
    setIndex((i) => i + 1);
    setFlipped(false);
  }, [deck, index, known, setKnown]);

  const undo = () => {
    const last = history[history.length - 1];
    if (!last) return;
    setKnown((cur) => { const next = { ...cur }; if (last.prev) next[last.cid] = last.prev; else delete next[last.cid]; return next; });
    setRound((r) => (last.knewIt ? { ...r, right: r.right - 1 } : { ...r, again: r.again.slice(0, -1) }));
    setHistory((h) => h.slice(0, -1));
    setIndex((i) => i - 1);
    setFlipped(false);
  };

  // Keyboard: space / enter flips, → or 2 = gewusst, ← or 1 = nochmal.
  useEffect(() => {
    const onKey = (e) => {
      if (e.target.closest('input, textarea, select, button')) return;
      if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); setFlipped((f) => !f); }
      else if (flipped && (e.key === 'ArrowRight' || e.key === '2')) answer(true);
      else if (flipped && (e.key === 'ArrowLeft' || e.key === '1')) answer(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [flipped, answer]);

  // Swipe on the card (after flipping): right = gewusst, left = nochmal.
  const swipe = useRef(null);
  const [dx, setDx] = useState(0);
  const swipeProps = {
    onPointerDown: (e) => { if (flipped) swipe.current = { x: e.clientX, id: e.pointerId }; },
    onPointerMove: (e) => { if (swipe.current?.id === e.pointerId) setDx(e.clientX - swipe.current.x); },
    onPointerUp: () => {
      if (!swipe.current) return;
      const d = dx; swipe.current = null; setDx(0);
      if (Math.abs(d) > 90) answer(d > 0);
    },
    onPointerCancel: () => { swipe.current = null; setDx(0); },
  };

  if (error) return <Empty icon={Layers} title="Karteikarten konnten nicht geladen werden" action={<Link className="btn" to="/">Zur Übersicht</Link>}>{error.message}</Empty>;
  if (!data || !deck) return <PageLoader />;
  const { subject } = data;
  const back = <Link to={`/fach/${subject.id}`} className="back-link"><ChevronLeft size={16} /> {subject.short || subject.title}</Link>;

  if (!data.cards.length) {
    return <div>{back}<Empty icon={Layers} title="Noch keine Karteikarten">In den Kapiteln dieses Fachs gibt es noch keine Karteikarten-Bausteine.</Empty></div>;
  }

  const knownCount = data.cards.filter((c) => known[c.id]).length;
  const done = index >= deck.length;
  const card = !done ? cards.get(deck[index]) : null;

  return (
    <div className="study" style={subjectStyle(subject)}>
      {back}
      <header className="page-head page-head-actions">
        <div>
          <h1>Karteikarten</h1>
          <p>{subject.title} · {knownCount} von {data.cards.length} gewusst</p>
        </div>
        <div className="head-actions">
          <button className={`chip ${onlyOpen ? 'on' : ''}`} aria-pressed={onlyOpen} onClick={() => setOnlyOpen((o) => !o)}>Nur offene</button>
          <button className="btn btn-sm" onClick={() => start(deck, { mix: true })}><Shuffle size={15} /> Mischen</button>
        </div>
      </header>

      <div className="study-progress">
        <div className="progress"><span style={{ width: `${(Math.min(index, deck.length) / deck.length) * 100}%` }} /></div>
        <span className="study-count">{Math.min(index + 1, deck.length)} / {deck.length}</span>
      </div>

      {done ? (
        <div className="study-done">
          <PartyPopper size={34} />
          <h2>Runde geschafft!</h2>
          <p><b className="ok">{round.right} gewusst</b> · <b className="again">{round.again.length} nochmal</b></p>
          <div className="study-done-actions">
            {round.again.length > 0 && <button className="btn btn-primary" onClick={() => start(round.again, { mix: true })}><RotateCcw size={16} /> Falsche wiederholen</button>}
            <button className="btn" onClick={() => start(data.cards.map((c) => c.id), { mix: true })}><Shuffle size={16} /> Alle Karten</button>
            {history.length > 0 && <button className="btn btn-ghost" onClick={undo}><Undo2 size={16} /> Letzte zurück</button>}
          </div>
        </div>
      ) : (
        <>
          <button type="button" className={`study-card ${flipped ? 'flipped' : ''}`} onClick={() => setFlipped((f) => !f)} {...swipeProps}
            style={dx ? { transform: `translateX(${dx}px) rotate(${dx / 30}deg)` } : undefined}
            aria-label={flipped ? 'Antwort – antippen für die Frage' : 'Frage – antippen für die Antwort'}>
            <span className="study-card-label">{flipped ? 'Antwort' : 'Frage'}{card.chapterTitle ? ` · ${card.chapterTitle}` : ''}</span>
            <span className="study-card-content"><RichText text={flipped ? card.back : card.front} /></span>
            {!flipped && <span className="study-card-hint">Antippen oder Leertaste zum Umdrehen</span>}
          </button>
          <div className="study-actions">
            <button className="study-btn again" onClick={() => answer(false)} disabled={!flipped}><X size={20} /> Nochmal</button>
            <button className="study-btn ok" onClick={() => answer(true)} disabled={!flipped}><Check size={20} /> Gewusst</button>
          </div>
          <div className="study-foot">
            {history.length > 0 ? <button className="btn btn-ghost btn-sm" onClick={undo}><Undo2 size={15} /> Zurück</button> : <span />}
            <span className="study-keys">Tasten: Leertaste umdrehen · ← nochmal · → gewusst</span>
          </div>
        </>
      )}
    </div>
  );
}
