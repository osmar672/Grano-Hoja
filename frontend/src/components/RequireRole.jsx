import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider.jsx';
import { roleNames } from '../auth/roleNames.js';

export default function RequireRole({ roles, children }) {
  const { user, loading } = useAuth();
  if (loading) return <main className="auth-check-screen" role="status"><span className="auth-spinner" /> Verificando permisos…</main>;
  if (!user) return <div className="access-denied"><h1>Inicia sesión</h1><p>Necesitas una sesión válida para continuar.</p><Link className="button button-primary" to="/login">Ir al acceso</Link></div>;
  if (!roles.includes(user.role)) {
    return <section className="access-denied page-stack"><span className="eyebrow">ACCESO RESTRINGIDO</span><h1>No tienes permiso para esta sección.</h1><p>Tu perfil actual es <strong>{roleNames[user.role] || user.role}</strong>. Solicita acceso a una persona administradora si necesitas esta función.</p><Link className="button button-primary" to="/">Volver al panel</Link></section>;
  }
  return children;
}
