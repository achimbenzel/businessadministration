// The semesters with their subjects — loaded once for the sidebar and the
// pages; admins reload it after changing a semester or subject.
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api } from './api.js';

const CatalogContext = createContext(null);

export function CatalogProvider({ children }) {
  const [state, setState] = useState({ semesters: null, error: null });
  const reload = useCallback(async () => {
    try { setState({ semesters: await api.semesters(), error: null }); } catch (error) { setState((s) => ({ ...s, error })); }
  }, []);
  useEffect(() => { reload(); }, [reload]);
  const value = useMemo(() => ({ ...state, reload }), [state, reload]);
  return <CatalogContext.Provider value={value}>{children}</CatalogContext.Provider>;
}

export const useCatalog = () => useContext(CatalogContext);
