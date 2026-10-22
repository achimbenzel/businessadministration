// Below 900 px: a slim top bar with the menu, the page title and search.
// It hides while scrolling down and comes back when scrolling up.
import { useEffect, useState } from 'react';
import { Menu as MenuIcon, Search } from 'lucide-react';
import { useCurrentTitle } from '../lib/pageTitle.js';

export default function MobileBar({ onMenu, onSearch }) {
  const title = useCurrentTitle();
  const [hidden, setHidden] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    let last = window.scrollY;
    const onScroll = () => {
      const y = window.scrollY;
      if (Math.abs(y - last) < 6) return;
      setHidden(y > last && y > 80);
      setScrolled(y > 60);
      last = y;
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Sticky bars below this one (chapter tabs, admin bar) move up while it's hidden.
  useEffect(() => {
    const root = document.documentElement;
    if (hidden) root.dataset.mbar = 'hidden'; else delete root.dataset.mbar;
    return () => { delete root.dataset.mbar; };
  }, [hidden]);

  return (
    <header className={`mbar ${hidden ? 'mbar-hidden' : ''}`}>
      <button className="icon-btn mbar-btn" onClick={onMenu} aria-label="Menü öffnen"><MenuIcon size={20} /></button>
      {/* The big page title is right below; this one fades in once that has scrolled away. */}
      <div className={`mbar-title ${scrolled ? '' : 'quiet'}`}>{title}</div>
      <button className="icon-btn mbar-btn" onClick={onSearch} aria-label="Suchen"><Search size={19} /></button>
    </header>
  );
}
