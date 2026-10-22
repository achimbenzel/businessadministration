// Search everywhere (Ctrl/⌘+K): subjects and chapters, including every block's text.
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, FileText, SearchX, CornerDownLeft } from 'lucide-react';
import Modal from './Modal.jsx';
import SubjectIcon from './SubjectIcon.jsx';
import { api } from '../lib/api.js';

export default function SearchDialog({ onClose }) {
  const [q, setQ] = useState('');
  const [results, setResults] = useState([]);
  const [busy, setBusy] = useState(false);
  const [active, setActive] = useState(0);
  const navigate = useNavigate();
  const listRef = useRef(null);

  useEffect(() => {
    const query = q.trim();
    if (query.length < 2) { setResults([]); setBusy(false); return undefined; }
    const ctrl = new AbortController();
    setBusy(true);
    const t = setTimeout(() => {
      api.search(query, ctrl.signal)
        .then((r) => { setResults(r); setActive(0); setBusy(false); })
        .catch((err) => { if (err.name !== 'AbortError') setBusy(false); });
    }, 160);
    return () => { clearTimeout(t); ctrl.abort(); };
  }, [q]);

  const open = (r) => {
    onClose();
    if (r.kind === 'subject') navigate(`/fach/${r.id}`);
    else navigate(`/kapitel/${r.id}${r.blockId ? `#b-${r.blockId}` : ''}`);
  };

  const onKey = (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive((a) => Math.min(results.length - 1, a + 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(0, a - 1)); }
    else if (e.key === 'Enter' && results[active]) { e.preventDefault(); open(results[active]); }
  };

  useEffect(() => {
    listRef.current?.querySelector('.search-hit.on')?.scrollIntoView({ block: 'nearest' });
  }, [active]);

  return (
    <Modal onClose={onClose} size="md" className="search-modal" labelledBy="search-label">
      <div className="search-field">
        <Search size={18} />
        <input id="search-label" className="search-input" value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={onKey}
          placeholder="Fächer und Kapitel durchsuchen …" aria-label="Suchen" autoComplete="off" enterKeyHint="search" />
        <kbd className="search-esc" onClick={onClose}>Esc</kbd>
      </div>
      <div className="search-results" ref={listRef}>
        {q.trim().length < 2 && <p className="search-note">Mindestens zwei Zeichen eingeben.</p>}
        {q.trim().length >= 2 && !busy && results.length === 0 && (
          <p className="search-note"><SearchX size={16} /> Nichts gefunden für „{q.trim()}“.</p>
        )}
        {results.map((r, i) => (
          <button key={`${r.kind}-${r.id}`} className={`search-hit ${i === active ? 'on' : ''}`} onMouseEnter={() => setActive(i)} onClick={() => open(r)}>
            {r.kind === 'subject' ? <SubjectIcon subject={r.subject} size={32} /> : <span className="search-hit-icon"><FileText size={16} /></span>}
            <span className="search-hit-text">
              <strong>{r.title}</strong>
              <small>{r.kind === 'subject' ? 'Fach' : r.subject?.title}{r.snippet ? ` · ${r.snippet}` : ''}</small>
            </span>
            {i === active && <CornerDownLeft size={15} className="search-hit-enter" />}
          </button>
        ))}
      </div>
    </Modal>
  );
}
