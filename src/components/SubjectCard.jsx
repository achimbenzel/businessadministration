// A subject tile: icon, abbreviation, title, chapter count and learning progress.
import { Link } from 'react-router-dom';
import { Layers } from 'lucide-react';
import SubjectIcon from './SubjectIcon.jsx';
import { subjectStyle } from '../lib/subjects.js';
import { plural } from '../lib/format.js';

export default function SubjectCard({ subject: s, learnedCount = 0 }) {
  const total = s.chapterCount || 0;
  const pct = total ? Math.round((learnedCount / total) * 100) : 0;
  return (
    <Link to={`/fach/${s.id}`} className="subj-card" style={subjectStyle(s)}>
      <div className="subj-card-top">
        <SubjectIcon subject={s} size={44} />
        {s.short && <span className="chip-static">{s.short}</span>}
      </div>
      <h3 className="subj-card-title">{s.title}</h3>
      <div className="subj-card-meta">
        <span>{total ? plural(total, 'Kapitel', 'Kapitel') : 'Noch keine Kapitel'}</span>
        {s.cardCount > 0 && <span className="subj-card-cards"><Layers size={13} /> {s.cardCount}</span>}
        {s.ects != null && <span>{s.ects} ECTS</span>}
      </div>
      <div className="progress" aria-label={`${pct} % gelernt`} title={`${learnedCount} von ${total} Kapiteln gelernt`}>
        <span style={{ width: `${pct}%` }} />
      </div>
    </Link>
  );
}
