// Admin: create or edit a subject — title, abbreviation, ECTS, description,
// icon and colour.
import { useState } from 'react';
import Modal from './Modal.jsx';
import AutoTextarea from './AutoTextarea.jsx';
import { SUBJECT_COLORS, SUBJECT_ICONS, subjectStyle } from '../lib/subjects.js';

export default function SubjectDialog({ subject, semesters, semesterId, onSave, onClose, onDelete }) {
  const [f, setF] = useState(() => ({
    title: subject?.title || '',
    short: subject?.short || '',
    ects: subject?.ects ?? '',
    description: subject?.description || '',
    icon: subject?.icon || 'book',
    color: subject?.color || 'teal',
    semesterId: subject?.semesterId || semesterId || semesters?.[0]?.id || '',
  }));
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e?.target ? e.target.value : e }));

  const submit = async (e) => {
    e.preventDefault();
    if (!f.title.trim() || busy) return;
    setBusy(true);
    try {
      await onSave({ ...f, title: f.title.trim(), ects: f.ects === '' ? null : Number(f.ects) });
    } finally { setBusy(false); }
  };

  return (
    <Modal title={subject ? 'Fach bearbeiten' : 'Neues Fach'} onClose={onClose}
      footer={(
        <>
          {onDelete && <button type="button" className="btn btn-danger foot-left" onClick={onDelete}>Löschen</button>}
          <button type="button" className="btn btn-ghost" onClick={onClose}>Abbrechen</button>
          <button type="submit" form="subject-form" className="btn btn-primary" disabled={!f.title.trim() || busy}>
            {subject ? 'Speichern' : 'Anlegen'}
          </button>
        </>
      )}>
      <form id="subject-form" className="form" onSubmit={submit}>
        <label className="field">
          <span>Name</span>
          <input className="input" value={f.title} onChange={set('title')} placeholder="z. B. Kosten- & Leistungsrechnung" maxLength={160} required />
        </label>
        <div className="field-row">
          <label className="field">
            <span>Kürzel</span>
            <input className="input" value={f.short} onChange={set('short')} placeholder="KLR" maxLength={12} />
          </label>
          <label className="field">
            <span>ECTS</span>
            <input className="input" type="number" inputMode="decimal" min="0" max="60" step="0.5" value={f.ects} onChange={set('ects')} placeholder="–" />
          </label>
        </div>
        {semesters?.length > 1 && (
          <label className="field">
            <span>Semester</span>
            <select className="input" value={f.semesterId} onChange={set('semesterId')}>
              {semesters.map((s) => <option key={s.id} value={s.id}>{s.title}</option>)}
            </select>
          </label>
        )}
        <label className="field">
          <span>Beschreibung</span>
          <AutoTextarea className="input textarea" minRows={3} value={f.description} onChange={set('description')}
            placeholder="Worum geht es in diesem Fach? Prüfungsform, Literatur …" maxLength={4000} />
        </label>
        <div className="field">
          <span>Symbol</span>
          <div className="icon-grid" role="radiogroup" aria-label="Symbol">
            {Object.entries(SUBJECT_ICONS).map(([key, Icon]) => (
              <button type="button" key={key} role="radio" aria-checked={f.icon === key} aria-label={key}
                className={`icon-choice ${f.icon === key ? 'on' : ''}`} style={subjectStyle({ color: f.color })} onClick={() => set('icon')(key)}>
                <Icon size={18} />
              </button>
            ))}
          </div>
        </div>
        <div className="field">
          <span>Farbe</span>
          <div className="color-row" role="radiogroup" aria-label="Farbe">
            {SUBJECT_COLORS.map((c) => (
              <button type="button" key={c} role="radio" aria-checked={f.color === c} aria-label={c}
                className={`color-choice ${f.color === c ? 'on' : ''}`} style={{ '--sw': `var(--c-${c})` }} onClick={() => set('color')(c)} />
            ))}
          </div>
        </div>
      </form>
    </Modal>
  );
}
