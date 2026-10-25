// The admin's block editor: every block with a slim toolbar (drag handle,
// type, "+" below, menu), "/" in an empty text block for the block menu,
// and "Baustein hinzufügen" at the end. Changes go up through onChange
// (the page autosaves them). `filter` shows one section only (Begriffe,
// Formeln, …); new blocks then land in that section.
import { useRef, useState } from 'react';
import { GripVertical, Plus, ArrowUp, ArrowDown, Copy, Trash2, Repeat } from 'lucide-react';
import Menu from '../Menu.jsx';
import BlockPicker from './BlockPicker.jsx';
import { BLOCKS } from './registry.js';
import { blockMeta, newBlock, rid, isEmptyBlock } from '../../lib/blocks.js';
import { useSortable, moveItem } from '../../lib/useSortable.js';
import { useToast } from '../Toast.jsx';
import { api } from '../../lib/api.js';
import { resolveSections, SECTIONS, sectionOf } from '../../lib/chapterTabs.js';

// Block types whose content can move over when converting (same text field).
const TEXTISH = new Set(['text', 'heading', 'quote', 'formula', 'callout', 'toggle', 'definition']);

export default function BlockEditor({ blocks, chapterId, onChange, lang = 'de', filter = null }) {
  const toast = useToast();
  const listRef = useRef(null);
  // Always change the newest list — uploads and quick edits can land between renders.
  const latest = useRef(blocks);
  latest.current = blocks;
  const commit = (next) => { latest.current = next; onChange(next); };

  // picker: null | { mode: 'insert', index } | { mode: 'replace', id }
  const [picker, setPicker] = useState(null);
  const [focusId, setFocusId] = useState(null);

  const patch = (id, p) => commit(latest.current.map((b) => (b.id === id ? { ...b, ...p } : b)));
  const insertAt = (index, type) => {
    const b = newBlock(type);
    if (filter) b.tab = filter;
    const next = [...latest.current];
    next.splice(index, 0, b);
    commit(next);
    setFocusId(b.id);
  };
  const replace = (id, type) => {
    const old = latest.current.find((b) => b.id === id);
    const b = { ...newBlock(type), id };
    if (old?.text && TEXTISH.has(type)) b.text = old.text;
    if (old?.text && type === 'list') b.items = old.text.split('\n');
    commit(latest.current.map((x) => (x.id === id ? b : x)));
    setFocusId(id);
  };
  const remove = (id) => {
    const index = latest.current.findIndex((b) => b.id === id);
    const removed = latest.current[index];
    commit(latest.current.filter((b) => b.id !== id));
    if (removed && !isEmptyBlock(removed)) {
      toast(`${blockMeta(removed.type).label} gelöscht`, {
        action: {
          label: 'Rückgängig',
          onClick: () => { const next = [...latest.current]; next.splice(index, 0, removed); commit(next); },
        },
      });
    }
  };
  const duplicate = (id) => {
    const i = latest.current.findIndex((b) => b.id === id);
    const copy = structuredClone(latest.current[i]);
    copy.id = rid();
    if (Array.isArray(copy.options)) copy.options = copy.options.map((o) => ({ ...o, id: rid() }));
    if (Array.isArray(copy.items) && copy.items.length && typeof copy.items[0] === 'object') copy.items = copy.items.map((x) => ({ ...x, id: rid() }));
    if (Array.isArray(copy.slides)) copy.slides = copy.slides.map((x) => ({ ...x, id: rid() }));
    const next = [...latest.current];
    next.splice(i + 1, 0, copy);
    commit(next);
  };
  // The blocks on screen (all, or one section) with their place in the full list.
  const sections = resolveSections(blocks);
  const shown = blocks.map((b, i) => ({ b, i, sec: sections[i] })).filter((x) => !filter || x.sec === filter);
  // from / to are positions on screen.
  const move = (from, to) => {
    if (to < 0 || to >= shown.length || from === to) return;
    commit(moveItem(latest.current, shown[from].i, shown[to].i));
  };
  const endIndex = filter && shown.length ? shown[shown.length - 1].i + 1 : blocks.length;

  const ids = shown.map((x) => x.b.id);
  const { grab, itemState } = useSortable({ ids, container: listRef, onMove: move });

  const upload = async (file) => {
    try {
      return await api.uploadFile(chapterId, file);
    } catch (err) {
      toast(`Upload fehlgeschlagen: ${err.message}`, { kind: 'error' });
      return null;
    }
  };

  const pick = (type) => {
    if (picker?.mode === 'replace') replace(picker.id, type);
    else insertAt(picker?.index ?? endIndex, type);
    setPicker(null);
  };

  return (
    // lang: the browser's spell check follows the chapter's language.
    <div className="editor" lang={lang}>
      <div className="ed-blocks" ref={listRef}>
        {shown.map(({ b, i, sec }, pos) => {
          const def = BLOCKS[b.type];
          if (!def) return null;
          const M = blockMeta(b.type);
          const st = itemState(b.id);
          return (
            <section key={b.id} id={`b-${b.id}`} data-sort-id={b.id} className={`ed-block ed-type-${b.type} ${st.className}`} style={st.style}
              aria-label={M.label}>
              <div className="ed-bar">
                <button type="button" className="ed-grip" aria-label="Ziehen zum Verschieben" title="Ziehen zum Verschieben" {...grab(b.id)}>
                  <GripVertical size={15} />
                </button>
                <span className="ed-type"><M.icon size={13} /> {M.label}</span>
                <span className="ed-bar-space" />
                <label className={`ed-sec ${b.tab ? '' : 'auto'}`} style={{ '--sc': `var(--c-${sectionOf(sec).color})` }} title="Abschnitt (Reiter) dieses Bausteins">
                  <span className="ed-sec-dot" aria-hidden="true" />
                  <select value={b.tab || ''} aria-label="Abschnitt" onChange={(e) => patch(b.id, { tab: e.target.value })}>
                    <option value="">Auto · {sectionOf(sec).label.de}</option>
                    {SECTIONS.map((x) => <option key={x.key} value={x.key}>{x.label.de}</option>)}
                  </select>
                </label>
                <button type="button" className="icon-btn icon-btn-ghost icon-btn-sm" aria-label="Baustein darunter einfügen" title="Darunter einfügen"
                  onClick={() => setPicker({ mode: 'insert', index: i + 1 })}><Plus size={15} /></button>
                <Menu label="Baustein-Aktionen" buttonClass="icon-btn icon-btn-ghost icon-btn-sm" items={[
                  { label: 'Nach oben', icon: ArrowUp, disabled: pos === 0, onClick: () => move(pos, pos - 1) },
                  { label: 'Nach unten', icon: ArrowDown, disabled: pos === shown.length - 1, onClick: () => move(pos, pos + 1) },
                  { label: 'Duplizieren', icon: Copy, onClick: () => duplicate(b.id) },
                  { label: 'Umwandeln in …', icon: Repeat, onClick: () => setPicker({ mode: 'replace', id: b.id }) },
                  '-',
                  { label: 'Löschen', icon: Trash2, danger: true, onClick: () => remove(b.id) },
                ]} />
              </div>
              <div className="ed-body">
                <def.Edit block={b} chapterId={chapterId} upload={upload} autoFocus={focusId === b.id}
                  onChange={(p) => patch(b.id, p)} onSlash={() => setPicker({ mode: 'replace', id: b.id })} />
              </div>
            </section>
          );
        })}
      </div>
      {filter && !shown.length && <p className="ed-empty-sec">In diesem Abschnitt gibt es noch keine Bausteine.</p>}
      <button type="button" className="add-row" onClick={() => setPicker({ mode: 'insert', index: endIndex })}>
        <Plus size={17} /> {filter ? `Baustein in „${sectionOf(filter).label.de}“ hinzufügen` : 'Baustein hinzufügen'}
      </button>
      {picker && (
        <BlockPicker title={picker.mode === 'replace' ? 'Baustein wählen' : 'Baustein hinzufügen'} onPick={pick} onClose={() => setPicker(null)} />
      )}
    </div>
  );
}
