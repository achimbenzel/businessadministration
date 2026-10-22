// Who is signed in. The session itself is an HttpOnly cookie the page can't
// read; the app asks /api/auth/me once at start and after login / logout.
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api } from './api.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [state, setState] = useState({ loading: true, user: null, offline: false });

  const refresh = useCallback(async () => {
    try {
      const user = await api.me();
      setState({ loading: false, user, offline: false });
    } catch {
      setState({ loading: false, user: null, offline: true });
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  // Any request answered with 401 (session expired, password changed) → login.
  useEffect(() => {
    const onLost = () => setState((s) => (s.user ? { ...s, user: null } : s));
    window.addEventListener('ba:unauthorized', onLost);
    return () => window.removeEventListener('ba:unauthorized', onLost);
  }, []);

  const value = useMemo(() => ({
    ...state,
    isAdmin: state.user?.role === 'admin',
    login: async (username, password) => {
      const user = await api.login(username, password);
      setState({ loading: false, user, offline: false });
      return user;
    },
    logout: async () => {
      await api.logout().catch(() => {});
      setState({ loading: false, user: null, offline: false });
    },
    refresh,
  }), [state, refresh]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
