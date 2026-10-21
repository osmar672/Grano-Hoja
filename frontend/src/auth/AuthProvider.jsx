import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { authService } from '../services/auth.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sessionError, setSessionError] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    authService.me({ signal: controller.signal })
      .then((result) => { setUser(result.user); setSessionError(''); })
      .catch((error) => {
        if (error.name === 'AbortError') return;
        setUser(null);
        if (error.status !== 401 && error.status !== 403) setSessionError(error.message);
      })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, []);

  const login = useCallback(async (credentials) => {
    const result = await authService.login(credentials);
    setUser(result.user);
    setSessionError('');
    return result.user;
  }, []);

  const logout = useCallback(async () => {
    await authService.logout();
    setUser(null);
    setSessionError('');
  }, []);

  const value = useMemo(() => ({ user, loading, sessionError, login, logout }), [user, loading, sessionError, login, logout]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return context;
}
