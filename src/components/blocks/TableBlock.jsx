// A simple table: optional header row, cells with inline formatting.
import { Plus, Minus } from 'lucide-react';
import { Inline } from '../Inline.jsx';

export function TableView({ block }) {
  const rows = block.rows.filter((r) => r.some((c) => c.trim()));
  if (!rows.length) return null;
  const [head, ...body] = block.header ? rows : [null, ...rows];
  return (
    <div className="blk-table-wrap">
      <table className="blk-table">
        {head && <thead><tr>{head.map((c, i) => <th key={i}><Inline text={c} /></th>)}</tr></thead>}
        <tbody>{body.map((r, i) => <tr key={i}>{r.map((c, j) => <td key={j}><Inline text={c} /></td>)}</tr>)}</tbody>
      </table>
    </div>
  );
}

export function TableEdit({ block, onChange }) {
  const rows = block.rows.length ? block.rows : [['']];
  const cols = rows[0].length;
  const setCell = (r, c, v) => onChange({ rows: rows.map((row, i) => (i === r ? row.map((x, j) => (j === c ? v : x)) : row)) });
  return (
    <div className="ed-stack">
      <div className="blk-table-wrap">
        <table className={`blk-table ed-table ${block.header ? 'has-head' : ''}`}>
          <tbody>
            {rows.map((row, r) => (
              <tr key={r}>
                {row.map((cell, c) => (
                  <td key={c}>
                    <input value={cell} onChange={(e) => setCell(r, c, e.target.value)} aria-label={`Zeile ${r + 1}, Spalte ${c + 1}`}
                      placeholder={block.header && r === 0 ? 'Überschrift' : ''} maxLength={1000} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="ed-row ed-table-tools">
        <span className="ed-help">Zeilen</span>
        <button type="button" className="icon-btn icon-btn-sm" aria-label="Zeile hinzufügen" disabled={rows.length >= 60} onClick={() => onChange({ rows: [...rows, Array(cols).fill('')] })}><Plus size={14} /></button>
        <button type="button" className="icon-btn icon-btn-sm" aria-label="Letzte Zeile entfernen" disabled={rows.length <= 1} onClick={() => onChange({ rows: rows.slice(0, -1) })}><Minus size={14} /></button>
        <span className="ed-help">Spalten</span>
        <button type="button" className="icon-btn icon-btn-sm" aria-label="Spalte hinzufügen" disabled={cols >= 10} onClick={() => onChange({ rows: rows.map((r) => [...r, '']) })}><Plus size={14} /></button>
        <button type="button" className="icon-btn icon-btn-sm" aria-label="Letzte Spalte entfernen" disabled={cols <= 1} onClick={() => onChange({ rows: rows.map((r) => r.slice(0, -1)) })}><Minus size={14} /></button>
        <label className="ed-check">
          <input type="checkbox" checked={block.header} onChange={(e) => onChange({ header: e.target.checked })} /> Kopfzeile
        </label>
      </div>
    </div>
  );
}
