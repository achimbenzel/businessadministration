import { LoaderCircle } from 'lucide-react';

/** Shown while a page (or its data) loads. */
export default function PageLoader() {
  return <div className="page-loader" role="status" aria-label="Lädt"><LoaderCircle className="spin" size={22} /></div>;
}
