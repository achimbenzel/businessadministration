// The parts of a split-up chapter: the tab bar (Übersicht · Begriffe · Formeln
// · Theorie · Interaktiv · Übungen), the contents list (a column on wide
// screens, a sheet on the phone), the overview cards and the "next section"
// buttons at the end of a tab. Sections come from lib/chapterTabs.js.
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
  LayoutGrid, BookMarked, Sigma, BookOpen, SlidersHorizontal, ListChecks, Hash, CircleHelp, Layers,
  TableOfContents, ArrowRight, ChevronLeft, ChevronRight,
} from 'lucide-react';

export const SECTION_ICON = {
  overview: LayoutGrid, terms: BookMarked, formulas: Sigma, theory: BookOpen, interactive: SlidersHorizontal, practice: ListChecks,
};
const ITEM_ICON = { heading: Hash, term: BookMarked, formula: Sigma, demo: SlidersHorizontal, quiz: CircleHelp, cards: Layers };

export const SECTION_TEXT = {
  de: {
    sections: 'Abschnitte', contents: 'Inhalt', all: 'Alle', inChapter: 'In diesem Kapitel', start: 'Los geht’s',
    back: 'Zurück', next: 'Weiter', more: (n) => `+ ${n} weitere`,
    count: {
      terms: (n) => `${n} ${n === 1 ? 'Begriff' : 'Begriffe'}`,
      formulas: (n) => `${n} ${n === 1 ? 'Formel' : 'Formeln'}`,
      theory: (n) => `${n} ${n === 1 ? 'Abschnitt' : 'Abschnitte'}`,
      interactive: (n) => `${n} ${n === 1 ? 'Demo' : 'Demos'}`,
      practice: (n) => `${n} ${n === 1 ? 'Aufgabe' : 'Aufgaben'}`,
    },
    hint: {
      terms: 'Die Grundbegriffe – zuerst lesen.',
      formulas: 'Alle Formeln mit Beispiel und Erklärung in einfachen Worten.',
      theory: 'Die Zusammenhänge Schritt für Schritt.',
      interactive: 'Selbst ausprobieren: Werte ändern, Kurven beobachten.',
      practice: 'Rechenbeispiele, Karteikarten und Quizfragen.',
    },
  },
  en: {
    sections: 'Sections', contents: 'Contents', all: 'All', inChapter: 'In this chapter', start: 'Let’s start',
    back: 'Back', next: 'Next', more: (n) => `+ ${n} more`,
    count: {
      terms: (n) => `${n} ${n === 1 ? 'term' : 'terms'}`,
      formulas: (n) => `${n} ${n === 1 ? 'formula' : 'formulas'}`,
      theory: (n) => `${n} ${n === 1 ? 'section' : 'sections'}`,
      interactive: (n) => `${n} ${n === 1 ? 'demo' : 'demos'}`,
      practice: (n) => `${n} ${n === 1 ? 'exercise' : 'exercises'}`,
    },
    hint: {
      terms: 'The key terms – read these first.',
      formulas: 'Every formula with an example and a plain-language explanation.',
      theory: 'How it all fits together, step by step.',
      interactive: 'Try it yourself: change values, watch the curves.',
      practice: 'Worked examples, flashcards and quiz questions.',
    },
  },
};
const textOf = (lang) => SECTION_TEXT[lang] || SECTION_TEXT.de;
const tone = (color) => ({ '--sc': `var(--c-${color})`, '--sc-rgb': `var(--c-${color}-rgb)` });

/**
 * The tab bar. tabs: [{ key, label, color, count }]; key null = "Alle" (editor).
 * onContents: shows the "Inhalt" button (hidden where the contents column is visible).
 */
export function SectionTabs({ tabs, current, onSelect, onContents, lang, sticky = true }) {
  const t = textOf(lang);
  const scroller = useRef(null);

  // Keep the active tab in view inside the horizontally scrolling row.
  useLayoutEffect(() => {
    const row = scroller.current;
    const el = row?.querySelector('[aria-selected="true"]');
    if (!row || !el) return;
    const left = el.getBoundingClientRect().left - row.getBoundingClientRect().left + row.scrollLeft;
    const l = left - 12;
    const r = left + el.offsetWidth + 12;
    if (l < row.scrollLeft) row.scrollLeft = l;
    else if (r > row.scrollLeft + row.clientWidth) row.scrollLeft = r - row.clientWidth;
  }, [current]);

  const onKey = (e) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    const i = tabs.findIndex((x) => x.key === current);
    const next = tabs[(i + (e.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length];
    onSelect(next.key);
    e.preventDefault();
    requestAnimationFrame(() => scroller.current?.querySelector('[aria-selected="true"]')?.focus());
  };

  return (
    <div className={`ch-tabs ${sticky ? 'sticky' : ''}`}>
      <div className="ch-tabs-row" role="tablist" aria-label={t.sections} ref={scroller} onKeyDown={onKey}>
        {tabs.map((s) => {
          const Icon = s.key ? SECTION_ICON[s.key] : Layers;
          const on = s.key === current;
          return (
            <button key={s.key || 'all'} type="button" role="tab" aria-selected={on} tabIndex={on ? 0 : -1}
              className={`ch-tab ${on ? 'on' : ''}`} style={tone(s.color || 'blue')} onClick={() => onSelect(s.key)}>
              <Icon size={15} />
              <span>{s.label}</span>
              {s.count > 0 && <span className="ch-tab-n">{s.count}</span>}
            </button>
          );
        })}
      </div>
      {onContents && (
        <button type="button" className="ch-toc-btn" onClick={onContents} aria-label={t.contents} title={t.contents}>
          <TableOfContents size={17} /><span>{t.contents}</span>
        </button>
      )}
    </div>
  );
}

/** Contents: every section with its entries. expandAll: all sections open (phone sheet). */
export function SectionToc({ sections, current, active, onSelect, onJump, lang, expandAll = false }) {
  const t = textOf(lang);
  return (
    <nav className="ch-toc-list" aria-label={t.contents}>
      {sections.map((s) => {
        const Icon = SECTION_ICON[s.key];
        const open = expandAll || s.key === current;
        return (
          <div key={s.key} className={`ch-toc-sec ${s.key === current ? 'on' : ''}`} style={tone(s.color)}>
            <button type="button" className="ch-toc-head" onClick={() => onSelect(s.key)} aria-current={s.key === current ? 'true' : undefined}>
              <span className="ch-toc-dot"><Icon size={13} /></span>
              <span className="ch-toc-name">{s.label}</span>
              {s.count > 0 && <span className="ch-toc-n">{s.count}</span>}
            </button>
            {open && s.items.length > 0 && (
              <ul>
                {s.items.map((it) => {
                  const II = ITEM_ICON[it.kind] || Hash;
                  return (
                    <li key={it.id}>
                      <button type="button" className={`ch-toc-item k-${it.kind} l${it.level || 2} ${active === it.id ? 'on' : ''}`} onClick={() => onJump(it.id, s.key)}>
                        <II size={13} /><span>{it.title}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        );
      })}
    </nav>
  );
}

/** The overview tab's map of the chapter: one card per section. */
export function SectionCards({ sections, onSelect, lang }) {
  const t = textOf(lang);
  const content = sections.filter((s) => s.key !== 'overview');
  if (!content.length) return null;
  return (
    <section className="ch-ov">
      <h2 className="ch-ov-title">{t.inChapter}</h2>
      <div className="ch-ov-grid">
        {content.map((s, i) => {
          const Icon = SECTION_ICON[s.key];
          const shown = s.items.slice(0, s.key === 'terms' ? 8 : 4);
          const rest = s.items.length - shown.length;
          return (
            <button key={s.key} type="button" className="ch-ov-card" style={tone(s.color)} onClick={() => onSelect(s.key)}>
              <span className="ch-ov-icon"><Icon size={18} /></span>
              <span className="ch-ov-body">
                <span className="ch-ov-head">
                  <span className="ch-ov-num">{String(i + 1).padStart(2, '0')}</span>
                  <strong>{s.label}</strong>
                  {s.count > 0 && t.count[s.key] && <small>{t.count[s.key](s.count)}</small>}
                </span>
                {t.hint[s.key] && <span className="ch-ov-hint">{t.hint[s.key]}</span>}
                {shown.length > 0 && (
                  <span className={`ch-ov-items ${s.key === 'terms' ? 'chips' : ''}`}>
                    {shown.map((it) => <span key={it.id}>{it.title}</span>)}
                    {rest > 0 && <span className="more">{t.more(rest)}</span>}
                  </span>
                )}
              </span>
              <ArrowRight size={17} className="ch-ov-go" />
            </button>
          );
        })}
      </div>
      <button type="button" className="btn btn-primary ch-start" onClick={() => onSelect(content[0].key)}>
        {t.start}: {content[0].label} <ArrowRight size={16} />
      </button>
    </section>
  );
}

/** "Zurück / Weiter" between sections at the end of a tab. */
export function SectionNav({ sections, current, onSelect, lang }) {
  const t = textOf(lang);
  const i = sections.findIndex((s) => s.key === current);
  const prev = sections[i - 1];
  const next = sections[i + 1];
  return (
    <nav className="chapter-nav ch-secnav" aria-label={t.sections}>
      {prev ? (
        <button type="button" className="nav-card prev" style={tone(prev.color)} onClick={() => onSelect(prev.key)}>
          <ChevronLeft size={18} /><span><small>{t.back}</small>{prev.label}</span>
        </button>
      ) : <span />}
      {next ? (
        <button type="button" className="nav-card next" style={tone(next.color)} onClick={() => onSelect(next.key)}>
          <span><small>{t.next}</small>{next.label}</span><ChevronRight size={18} />
        </button>
      ) : <span />}
    </nav>
  );
}

/** The id of the last entry scrolled past the top bars — the contents list highlights it. */
export function useScrollSpy(ids, offset = 150) {
  const [active, setActive] = useState(null);
  const key = ids.join('|');
  useEffect(() => {
    if (!ids.length) { setActive(null); return undefined; }
    let frame = 0;
    const check = () => {
      frame = 0;
      let hit = ids[0];
      for (const id of ids) {
        const el = document.getElementById(`b-${id}`);
        if (el && el.getBoundingClientRect().top <= offset) hit = id;
      }
      setActive(hit);
    };
    const onScroll = () => { if (!frame) frame = requestAnimationFrame(check); };
    check();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => { cancelAnimationFrame(frame); window.removeEventListener('scroll', onScroll); window.removeEventListener('resize', onScroll); };
  }, [key, offset]); // eslint-disable-line react-hooks/exhaustive-deps
  return active;
}
