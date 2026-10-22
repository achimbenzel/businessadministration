// Media blocks: image (upload), files (lecture slides, PDFs …) and links.
import { useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ImagePlus, Upload, FileText, Download, Link2, ExternalLink, X, Plus, LoaderCircle, RefreshCw } from 'lucide-react';
import { fileUrl } from '../../lib/api.js';
import { fmtBytes } from '../../lib/format.js';
import { rid } from '../../lib/blocks.js';
import { Inline } from '../Inline.jsx';
import { useBlockText } from '../../lib/blockText.js';

const hostOf = (url) => { try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return url; } };
const safeLink = (url) => (/^(https?:\/\/|mailto:)/i.test(url || '') ? url : null);

/** A drop zone + file picker that uploads through `upload(file)`. */
function Dropzone({ accept, multiple = false, upload, onUploaded, icon: Icon = Upload, children }) {
  const input = useRef(null);
  const [busy, setBusy] = useState(0);
  const [over, setOver] = useState(false);
  const take = async (files) => {
    for (const f of [...files].slice(0, multiple ? 20 : 1)) {
      setBusy((n) => n + 1);
      try {
        const ref = await upload(f);
        if (ref) onUploaded(ref);
      } finally { setBusy((n) => n - 1); }
    }
  };
  return (
    <div className={`dropzone ${over ? 'over' : ''}`} role="button" tabIndex={0}
      onClick={() => input.current?.click()} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); input.current?.click(); } }}
      onDragOver={(e) => { e.preventDefault(); setOver(true); }} onDragLeave={() => setOver(false)}
      onDrop={(e) => { e.preventDefault(); setOver(false); take(e.dataTransfer.files); }}>
      {busy ? <LoaderCircle size={20} className="spin" /> : <Icon size={20} />}
      <span>{busy ? 'Wird hochgeladen …' : children}</span>
      <input ref={input} type="file" hidden accept={accept} multiple={multiple} onChange={(e) => { take(e.target.files); e.target.value = ''; }} />
    </div>
  );
}

export function ImageView({ block }) {
  const t = useBlockText();
  const [zoom, setZoom] = useState(false);
  if (!block.src) return null;
  return (
    <figure className="blk-image">
      <button type="button" className="blk-image-btn" onClick={() => setZoom(true)} aria-label={t.zoom}>
        <img src={fileUrl(block.src)} alt={block.alt || block.caption || ''} loading="lazy" />
      </button>
      {block.caption && <figcaption><Inline text={block.caption} /></figcaption>}
      {zoom && createPortal(
        <div className="lightbox" onClick={() => setZoom(false)} role="dialog" aria-label={block.alt || t.zoom}>
          <img src={fileUrl(block.src)} alt={block.alt || ''} />
          <button className="icon-btn lightbox-close" aria-label={t.close}><X size={20} /></button>
        </div>,
        document.body,
      )}
    </figure>
  );
}
export function ImageEdit({ block, onChange, upload }) {
  const replace = useRef(null);
  const [busy, setBusy] = useState(false);
  const swap = async (file) => {
    if (!file) return;
    setBusy(true);
    try { const ref = await upload(file); if (ref) onChange({ src: ref.src }); } finally { setBusy(false); }
  };
  if (!block.src) {
    return (
      <Dropzone accept="image/*" upload={upload} icon={ImagePlus} onUploaded={(ref) => onChange({ src: ref.src, alt: block.alt || ref.name.replace(/\.[^.]+$/, '') })}>
        Bild hierher ziehen oder <u>auswählen</u> (PNG, JPG, WebP, GIF)
      </Dropzone>
    );
  }
  return (
    <figure className="blk-image ed-stack">
      <img src={fileUrl(block.src)} alt={block.alt} />
      <div className="ed-row">
        <input className="input input-sm" value={block.caption} placeholder="Bildunterschrift (optional)" maxLength={500}
          onChange={(e) => onChange({ caption: e.target.value })} />
        <button type="button" className="btn btn-sm" onClick={() => replace.current?.click()} disabled={busy}>
          {busy ? <LoaderCircle size={14} className="spin" /> : <RefreshCw size={14} />} Ersetzen
        </button>
        <input ref={replace} type="file" accept="image/*" hidden onChange={(e) => { swap(e.target.files?.[0]); e.target.value = ''; }} />
      </div>
      <input className="input input-sm" value={block.alt} placeholder="Alternativtext – was ist zu sehen? (für Screenreader)" maxLength={300}
        onChange={(e) => onChange({ alt: e.target.value })} />
    </figure>
  );
}

function FileRow({ f, onRemove }) {
  const t = useBlockText();
  return (
    <div className="file-row">
      <FileText size={18} className="file-row-icon" />
      <span className="file-row-text">
        <strong>{f.name}</strong>
        {f.size > 0 && <small>{fmtBytes(f.size)}</small>}
      </span>
      {onRemove ? (
        <button type="button" className="icon-btn icon-btn-ghost icon-btn-sm" onClick={onRemove} aria-label={`${f.name} entfernen`}><X size={15} /></button>
      ) : (
        <a className="icon-btn icon-btn-ghost icon-btn-sm" href={fileUrl(f.src)} download={f.name} aria-label={`${f.name} ${t.download}`} title={t.download}><Download size={16} /></a>
      )}
    </div>
  );
}

export function FilesView({ block }) {
  if (!block.items.length) return null;
  return (
    <div className="blk-files">
      {block.items.map((f) => (
        <a key={f.id} className="file-link" href={fileUrl(f.src)} target="_blank" rel="noopener noreferrer">
          <FileRow f={f} />
        </a>
      ))}
    </div>
  );
}
export function FilesEdit({ block, onChange, upload }) {
  // Several uploads can finish one after another — always add to the latest list.
  const latest = useRef(block.items);
  latest.current = block.items;
  return (
    <div className="blk-files ed-stack">
      {block.items.map((f) => (
        <FileRow key={f.id} f={f} onRemove={() => onChange({ items: block.items.filter((x) => x.id !== f.id) })} />
      ))}
      <Dropzone multiple upload={upload} onUploaded={(ref) => {
        latest.current = [...latest.current, { id: rid(), ...ref }];
        onChange({ items: latest.current });
      }}>
        Dateien hierher ziehen oder <u>auswählen</u> – Folien, Skripte, Übungen
      </Dropzone>
    </div>
  );
}

export function LinksView({ block }) {
  const items = block.items.filter((l) => safeLink(l.url));
  if (!items.length) return null;
  return (
    <div className="blk-links">
      {items.map((l) => (
        <a key={l.id} className="link-row" href={l.url} target="_blank" rel="noopener noreferrer">
          <Link2 size={17} className="link-row-icon" />
          <span className="link-row-text"><strong>{l.title || hostOf(l.url)}</strong><small>{hostOf(l.url)}</small></span>
          <ExternalLink size={15} className="link-row-ext" />
        </a>
      ))}
    </div>
  );
}
export function LinksEdit({ block, onChange, autoFocus }) {
  const set = (items) => onChange({ items });
  const patch = (id, p) => set(block.items.map((l) => (l.id === id ? { ...l, ...p } : l)));
  return (
    <div className="blk-links ed-stack">
      {block.items.map((l, i) => (
        <div className="ed-link" key={l.id}>
          <Link2 size={16} className="link-row-icon" />
          <div className="ed-link-fields">
            <input className="input input-sm" value={l.title} placeholder="Titel" maxLength={200} autoFocus={autoFocus && i === 0}
              onChange={(e) => patch(l.id, { title: e.target.value })} />
            <input className="input input-sm" value={l.url} placeholder="https://…" inputMode="url" maxLength={2000}
              onChange={(e) => patch(l.id, { url: e.target.value })} />
          </div>
          <button type="button" className="icon-btn icon-btn-ghost icon-btn-sm" aria-label="Link entfernen" onClick={() => set(block.items.filter((x) => x.id !== l.id))}><X size={15} /></button>
        </div>
      ))}
      <button type="button" className="btn btn-ghost btn-sm" onClick={() => set([...block.items, { id: rid(), url: '', title: '' }])}><Plus size={14} /> Link</button>
    </div>
  );
}
