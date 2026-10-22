// Practice blocks: flashcards (flip to see the answer) and multiple-choice
// questions (check, then see the explanation).
import { useState } from 'react';
import { Layers, RotateCcw, Check, X, Plus, CircleHelp } from 'lucide-react';
import AutoTextarea from '../AutoTextarea.jsx';
import { Inline, RichText } from '../Inline.jsx';
import { rid } from '../../lib/blocks.js';

export function FlashcardView({ block }) {
  const [flipped, setFlipped] = useState(false);
  return (
    <button type="button" className={`blk-card ${flipped ? 'flipped' : ''}`} onClick={() => setFlipped((f) => !f)}
      aria-label={flipped ? 'Karteikarte: Frage zeigen' : 'Karteikarte: Antwort zeigen'}>
      <span className="blk-card-label"><Layers size={14} /> {flipped ? 'Antwort' : 'Frage'}</span>
      <span className="blk-card-content">
        <RichText text={flipped ? block.back : block.front} />
      </span>
      <span className="blk-card-hint"><RotateCcw size={13} /> {flipped ? 'Zur Frage' : 'Antippen zum Umdrehen'}</span>
    </button>
  );
}
export function FlashcardEdit({ block, onChange, autoFocus }) {
  return (
    <div className="ed-card">
      <label className="ed-card-side">
        <span className="blk-card-label"><Layers size={14} /> Vorderseite – Frage</span>
        <AutoTextarea className="ed-text" value={block.front} minRows={3} autoFocus={autoFocus} placeholder="Was ist …?"
          onChange={(e) => onChange({ front: e.target.value })} />
      </label>
      <label className="ed-card-side">
        <span className="blk-card-label">Rückseite – Antwort</span>
        <AutoTextarea className="ed-text" value={block.back} minRows={3} placeholder="Antwort"
          onChange={(e) => onChange({ back: e.target.value })} />
      </label>
    </div>
  );
}

export function QuizView({ block }) {
  const options = block.options.filter((o) => o.text.trim());
  const multi = options.filter((o) => o.correct).length > 1;
  const [picked, setPicked] = useState(() => new Set());
  const [checked, setChecked] = useState(false);
  const pick = (id) => {
    if (checked) return;
    setPicked((cur) => {
      const next = new Set(multi ? cur : []);
      if (cur.has(id) && multi) next.delete(id); else next.add(id);
      return next;
    });
  };
  const right = options.every((o) => o.correct === picked.has(o.id));
  return (
    <div className="blk-quiz">
      <div className="blk-quiz-label"><CircleHelp size={14} /> Quizfrage{multi ? ' · mehrere Antworten richtig' : ''}</div>
      <div className="blk-quiz-q"><RichText text={block.question} /></div>
      <div className="blk-quiz-options" role={multi ? 'group' : 'radiogroup'}>
        {options.map((o) => {
          const on = picked.has(o.id);
          const state = checked ? (o.correct ? 'right' : on ? 'wrong' : '') : '';
          return (
            <button key={o.id} type="button" role={multi ? 'checkbox' : 'radio'} aria-checked={on}
              className={`blk-quiz-opt ${on ? 'on' : ''} ${state}`} onClick={() => pick(o.id)} disabled={checked && !on && !o.correct}>
              <span className={`blk-quiz-mark ${multi ? 'square' : ''}`}>
                {checked && o.correct ? <Check size={13} /> : checked && on ? <X size={13} /> : null}
              </span>
              <span><Inline text={o.text} /></span>
            </button>
          );
        })}
      </div>
      {checked ? (
        <div className={`blk-quiz-result ${right ? 'right' : 'wrong'}`}>
          <strong>{right ? 'Richtig!' : 'Leider nicht ganz.'}</strong>
          {block.explanation && <RichText text={block.explanation} />}
          <button type="button" className="btn btn-sm" onClick={() => { setChecked(false); setPicked(new Set()); }}><RotateCcw size={14} /> Nochmal</button>
        </div>
      ) : (
        <button type="button" className="btn btn-primary btn-sm" disabled={!picked.size} onClick={() => setChecked(true)}>Antwort prüfen</button>
      )}
    </div>
  );
}
export function QuizEdit({ block, onChange, autoFocus }) {
  const setOptions = (options) => onChange({ options });
  const patchOpt = (id, p) => setOptions(block.options.map((o) => (o.id === id ? { ...o, ...p } : o)));
  return (
    <div className="blk-quiz ed-stack">
      <AutoTextarea className="ed-text ed-quiz-q" value={block.question} minRows={2} autoFocus={autoFocus} placeholder="Frage"
        onChange={(e) => onChange({ question: e.target.value })} />
      <div className="ed-quiz-options">
        {block.options.map((o, i) => (
          <div className="ed-quiz-opt" key={o.id}>
            <button type="button" className={`ed-quiz-correct ${o.correct ? 'on' : ''}`} onClick={() => patchOpt(o.id, { correct: !o.correct })}
              aria-pressed={o.correct} title={o.correct ? 'Richtige Antwort' : 'Als richtig markieren'} aria-label={`Antwort ${i + 1} richtig`}>
              <Check size={14} />
            </button>
            <input className="input input-sm" value={o.text} placeholder={`Antwort ${i + 1}`} maxLength={1000}
              onChange={(e) => patchOpt(o.id, { text: e.target.value })} />
            <button type="button" className="icon-btn icon-btn-ghost icon-btn-sm" aria-label="Antwort entfernen" disabled={block.options.length <= 2}
              onClick={() => setOptions(block.options.filter((x) => x.id !== o.id))}><X size={15} /></button>
          </div>
        ))}
        {block.options.length < 10 && (
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setOptions([...block.options, { id: rid(), text: '', correct: false }])}>
            <Plus size={14} /> Antwort
          </button>
        )}
      </div>
      <p className="ed-help">Haken = richtige Antwort. Mehrere Haken → Mehrfachauswahl.</p>
      <AutoTextarea className="ed-text" value={block.explanation} minRows={2} placeholder="Erklärung, die nach dem Prüfen erscheint (optional)"
        onChange={(e) => onChange({ explanation: e.target.value })} />
    </div>
  );
}
