// The shell: login gate, sidebar / drawer, the phone's top bar, the routes
// (lazy-loaded pages) and the search dialog.
import { lazy, Suspense, useEffect, useState } from 'react';
import { Route, Routes, useLocation } from 'react-router-dom';
import { LoaderCircle } from 'lucide-react';
import { AuthProvider, useAuth } from './lib/auth.jsx';
import { CatalogProvider } from './lib/catalog.jsx';
import { usePref } from './lib/prefs.js';
import { DESKTOP, useMediaQuery } from './lib/useMedia.js';
import { ToastProvider } from './components/Toast.jsx';
import ErrorBoundary from './components/ErrorBoundary.jsx';
import Sidebar from './components/Sidebar.jsx';
import MobileBar from './components/MobileBar.jsx';
import PageLoader from './components/PageLoader.jsx';
import LoginPage from './pages/LoginPage.jsx';
import HomePage from './pages/HomePage.jsx';

const SemesterDetail = lazy(() => import('./pages/SemesterDetail.jsx'));
const SubjectDetail = lazy(() => import('./pages/SubjectDetail.jsx'));
const ChapterDetail = lazy(() => import('./pages/ChapterDetail.jsx'));
const FlashcardsPage = lazy(() => import('./pages/FlashcardsPage.jsx'));
const TrashPage = lazy(() => import('./pages/TrashPage.jsx'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage.jsx'));
const SearchDialog = lazy(() => import('./components/SearchDialog.jsx'));

export default function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <Gate />
      </AuthProvider>
    </ToastProvider>
  );
}

// Nobody gets past the login without a password — the API checks that too.
function Gate() {
  const { loading, user } = useAuth();
  if (loading) return <Splash />;
  if (!user) return <LoginPage />;
  return (
    <CatalogProvider>
      <Shell />
    </CatalogProvider>
  );
}

function Splash() {
  return <div className="splash"><LoaderCircle className="spin" size={26} /></div>;
}

function Shell() {
  const desktop = useMediaQuery(DESKTOP);
  const [collapsed, setCollapsed] = usePref('sidebarCollapsed', false);
  const [drawer, setDrawer] = useState(false);
  const [search, setSearch] = useState(false);
  const location = useLocation();

  // The drawer closes after every navigation and when the window gets wide.
  useEffect(() => { setDrawer(false); }, [location.pathname, desktop]);
  // New page → top (unless the URL points at a block).
  useEffect(() => { if (!location.hash) window.scrollTo(0, 0); }, [location.pathname, location.hash]);

  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setSearch((s) => !s); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <div className="app" data-sidebar={desktop && collapsed ? 'collapsed' : 'open'} data-drawer={drawer ? 'open' : 'closed'}>
      <Sidebar desktop={desktop} collapsed={collapsed} onToggleCollapsed={() => setCollapsed(!collapsed)}
        onSearch={() => { setDrawer(false); setSearch(true); }} onNavigate={() => setDrawer(false)} />
      {!desktop && drawer && <div className="drawer-backdrop" onClick={() => setDrawer(false)} aria-hidden="true" />}
      <div className="main">
        {!desktop && <MobileBar onMenu={() => setDrawer(true)} onSearch={() => setSearch(true)} />}
        <main className="main-inner">
          <ErrorBoundary key={location.pathname}>
            <Suspense fallback={<PageLoader />}>
              <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/semester/:id" element={<SemesterDetail />} />
                <Route path="/fach/:id" element={<SubjectDetail />} />
                <Route path="/fach/:id/karteikarten" element={<FlashcardsPage />} />
                <Route path="/kapitel/:id" element={<ChapterDetail />} />
                <Route path="/papierkorb" element={<TrashPage />} />
                <Route path="*" element={<NotFoundPage />} />
              </Routes>
            </Suspense>
          </ErrorBoundary>
        </main>
      </div>
      {search && <Suspense fallback={null}><SearchDialog onClose={() => setSearch(false)} /></Suspense>}
    </div>
  );
}
