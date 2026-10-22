import { Link } from 'react-router-dom';
import { MapPinOff } from 'lucide-react';
import Empty from '../components/Empty.jsx';
import { usePageTitle } from '../lib/pageTitle.js';

export default function NotFoundPage() {
  usePageTitle('Nicht gefunden');
  return <Empty icon={MapPinOff} title="Seite nicht gefunden" action={<Link className="btn" to="/">Zur Übersicht</Link>}>Diese Adresse gibt es nicht.</Empty>;
}
