import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider.jsx';

export default function RequireAuth({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <main className="auth-check-screen" role="status"><span className="auth-spinner" /> Verificando tu sesión…</main>;
  }
  if (!user) return <Navigate to="/login" replace state={{ from: location }} />;
  return children;
}
