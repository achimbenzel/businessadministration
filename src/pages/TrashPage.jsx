// Admin: deleted chapters — restore or delete for good. Purged after 30 days.
import { Link } from 'react-router-dom';
import { Trash2, RotateCcw, Lock } from 'lucide-react';
import Empty from '../components/Empty.jsx';
import PageLoader from '../components/PageLoader.jsx';
import { useToast } from '../components/Toast.jsx';
import { useConfirm } from '../components/ConfirmDialog.jsx';
import { api } from '../lib/api.js';
import { useAuth } from '../lib/auth.jsx';
import { useCatalog } from '../lib/catalog.jsx';
import { useLoad } from '../lib/useLoad.js';
import { usePageTitle } from '../lib/pageTitle.js';
import { fmtDate, fmtRelative } from '../lib/format.js';
import '../styles/catalog.css';

export default function TrashPage() {
  usePageTitle('Papierkorb');
  const { isAdmin } = useAuth();
  if (!isAdmin) return <Empty icon={Lock} title="Nur für Admins" action={<Link className="btn" to="/">Zur Übersicht</Link>} />;
  return <Trash />;
}

function Trash() {
  const { data, error, setData } = useLoad(() => api.trash(), []);
  const catalog = useCatalog();
  const toast = useToast();
  const { confirm, dialog } = useConfirm();

  const restore = async (t) => {
    try {
      await api.restoreTrash(t.id);
      setData((items) => items.filter((x) => x.id !== t.id));
      catalog.reload();
      toast(`„${t.title}“ wiederhergestellt`, { kind: 'ok' });
    } catch (err) { toast(err.message, { kind: 'error' }); }
  };
  const purge = async (t) => {
    if (!(await confirm({ title: 'Endgültig löschen?', message: `„${t.title}“ und seine Dateien werden unwiderruflich gelöscht.`, confirmLabel: 'Endgültig löschen', danger: true }))) return;
    try {
      await api.purgeTrash(t.id);
      setData((items) => items.filter((x) => x.id !== t.id));
    } catch (err) { toast(err.message, { kind: 'error' }); }
  };

  return (
    <div>
      <header className="page-head">
        <h1>Papierkorb</h1>
        <p>Gelöschte Kapitel bleiben 30 Tage hier und lassen sich wiederherstellen.</p>
      </header>
      {error && <Empty icon={Trash2} title="Papierkorb konnte nicht geladen werden">{error.message}</Empty>}
      {!data && !error && <PageLoader />}
      {data && !data.length && <Empty icon={Trash2} title="Der Papierkorb ist leer" />}
      {data?.length > 0 && (
        <div className="row-list">
          {data.map((t) => (
            <div key={t.id} className="row-item trash-row">
              <span className="row-icon"><Trash2 size={16} /></span>
              <span className="row-text">
                <strong>{t.title}</strong>
                <small>{t.subjectTitle || 'Unbekanntes Fach'} · gelöscht {fmtRelative(t.deletedAt)} · endgültig am {fmtDate(t.purgeAt)}</small>
              </span>
              <div className="row-actions">
                <button className="btn btn-sm" onClick={() => restore(t)}><RotateCcw size={14} /> Wiederherstellen</button>
                <button className="icon-btn icon-btn-sm btn-danger-icon" onClick={() => purge(t)} aria-label="Endgültig löschen" title="Endgültig löschen"><Trash2 size={15} /></button>
              </div>
            </div>
          ))}
        </div>
      )}
      {dialog}
    </div>
  );
}
