// A subject's icon on a tile tinted in its colour.
import { subjectIcon, subjectStyle } from '../lib/subjects.js';

export default function SubjectIcon({ subject, size = 40, className = '' }) {
  const Icon = subjectIcon(subject?.icon);
  return (
    <span className={`subj-icon ${className}`} style={{ ...subjectStyle(subject), width: size, height: size }} aria-hidden="true">
      <Icon size={Math.round(size * 0.5)} />
    </span>
  );
}
