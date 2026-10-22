// "Add block": every block type in groups, with a filter field.
import { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import Modal from '../Modal.jsx';
import { BLOCK_GROUPS, BLOCK_META } from '../../lib/blocks.js';
import { TOUCH, useMediaQuery } from '../../lib/useMedia.js';

export default function BlockPicker({ onPick, onClose, title = 'Baustein hinzufügen' }) {
  const [q, setQ] = useState('');
  const touch = useMediaQuery(TOUCH);
  const groups = useMemo(() => {
    const f = q.trim().toLowerCase();
    return BLOCK_GROUPS.map((g) => ({
      ...g,
      types: g.types.filter((t) => !f || `${BLOCK_META[t].label} ${BLOCK_META[t].hint}`.toLowerCase().includes(f)),
    })).filter((g) => g.types.length);
  }, [q]);
  const first = groups[0]?.types[0];

  return (
    <Modal title={title} onClose={onClose} size="md" className="picker-modal" focusInput={!touch}>
      <div className="picker-search">
        <Search size={16} />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filtern … (Enter wählt den ersten)" aria-label="Bausteine filtern"
          onKeyDown={(e) => { if (e.key === 'Enter' && first) { e.preventDefault(); onPick(first); } }} />
      </div>
      {groups.map((g) => (
        <section key={g.key} className="picker-group">
          <h3>{g.label}</h3>
          <div className="picker-grid">
            {g.types.map((t) => {
              const M = BLOCK_META[t];
              return (
                <button key={t} type="button" className="picker-item" onClick={() => onPick(t)}>
                  <span className="picker-icon"><M.icon size={18} /></span>
                  <span className="picker-text"><strong>{M.label}</strong><small>{M.hint}</small></span>
                </button>
              );
            })}
          </div>
        </section>
      ))}
      {!groups.length && <p className="search-note">Kein Baustein passt zu „{q}“.</p>}
    </Modal>
  );
}
