// Admin: create or edit a semester.
import { useState } from 'react';
import Modal from './Modal.jsx';
import AutoTextarea from './AutoTextarea.jsx';

export default function SemesterDialog({ semester, nextNumber = 1, onSave, onClose, onDelete }) {
  const [number, setNumber] = useState(semester?.number ?? nextNumber);
  const [title, setTitle] = useState(semester?.title || '');
  const [description, setDescription] = useState(semester?.description || '');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    try {
      const n = Math.max(1, Math.min(12, Number(number) || 1));
      await onSave({ number: n, title: title.trim() || `${n}. Semester`, description });
    } finally { setBusy(false); }
  };

  return (
    <Modal title={semester ? 'Semester bearbeiten' : 'Neues Semester'} onClose={onClose} size="sm"
      footer={(
        <>
          {onDelete && <button type="button" className="btn btn-danger foot-left" onClick={onDelete}>Löschen</button>}
          <button type="button" className="btn btn-ghost" onClick={onClose}>Abbrechen</button>
          <button type="submit" form="semester-form" className="btn btn-primary" disabled={busy}>{semester ? 'Speichern' : 'Anlegen'}</button>
        </>
      )}>
      <form id="semester-form" className="form" onSubmit={submit}>
        <div className="field-row">
          <label className="field field-narrow">
            <span>Nummer</span>
            <input className="input" type="number" inputMode="numeric" min="1" max="12" value={number} onChange={(e) => setNumber(e.target.value)} />
          </label>
          <label className="field">
            <span>Titel</span>
            <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder={`${Number(number) || 1}. Semester`} maxLength={80} />
          </label>
        </div>
        <label className="field">
          <span>Beschreibung</span>
          <AutoTextarea className="input textarea" minRows={3} value={description} onChange={(e) => setDescription(e.target.value)}
            placeholder="Schwerpunkte, Zeitraum, Hinweise …" maxLength={2000} />
        </label>
      </form>
    </Modal>
  );
}
