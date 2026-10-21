import { useState } from 'react';
import { NavLink, Link, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider.jsx';

const navigation = [
  { to: '/', label: 'Panel', caption: 'Resumen del día', icon: '◫', end: true },
  { to: '/productos', label: 'Productos', caption: 'Menú y recetas', icon: '✳' },
  { to: '/insumos', label: 'Insumos', caption: 'Inventario', icon: '❋' },
  { to: '/pedidos', label: 'Pedidos', caption: 'Ventas e historial', icon: '↗' },
  { to: '/asistente-compras', label: 'Asistente IA', caption: 'Sugerencias de compra', icon: '✦' },
];
const roleNames = { admin: 'Administración', encargado: 'Encargado', caja: 'Caja' };

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [loggingOut, setLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState('');

  async function handleLogout() {
    setLoggingOut(true);
    setLogoutError('');
    try {
      await logout();
      navigate('/login', { replace: true });
    } catch {
      setLogoutError('No se pudo cerrar la sesión. Comprueba la conexión e inténtalo de nuevo.');
    } finally {
      setLoggingOut(false);
    }
  }

  const initials = (user?.displayName || user?.email || 'GH')
    .split(/[\s@._-]+/).filter(Boolean).slice(0, 2).map((part) => part[0].toUpperCase()).join('');

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Link className="brand" to="/" aria-label="Grano & Hoja, ir al panel">
          <span className="brand-mark" aria-hidden="true"><span className="brand-mark-leaf">❧</span></span>
          <span className="brand-copy"><strong>Grano <i>&</i> Hoja</strong><small>CAFÉ · INVENTARIO · CUIDADO</small></span>
        </Link>
        <div className="sidebar-section-label">ESPACIO DE TRABAJO</div>
        <nav className="main-nav" aria-label="Navegación principal">
          {navigation.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.end} className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
              <span className="nav-icon" aria-hidden="true">{item.icon}</span>
              <span className="nav-copy"><strong>{item.label}</strong><small>{item.caption}</small></span>
              <span className="nav-chevron" aria-hidden="true">↗</span>
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-spacer" />
        <div className="sidebar-note"><div className="sidebar-note-icon" aria-hidden="true">❧</div><div><strong>De la finca a la taza</strong><p>Cada ingrediente cuenta. Cada detalle también.</p></div></div>
        <div className="sidebar-footer"><span className="sidebar-footer-dot" /> GRANO & HOJA <span>·</span> GESTIÓN</div>
      </aside>

      <div className="workspace">
        <header className="workspace-topbar">
          <div className="workspace-context"><span className="context-mark" aria-hidden="true">GH</span><div><span className="context-kicker">TU CAFETERÍA, EN EQUILIBRIO</span><strong>Espacio de operación</strong></div></div>
          <div className="topbar-tools">
            <span className="topbar-motto"><span aria-hidden="true">✧</span> Hecho con calma</span>
            <div className="topbar-user" title={`${user?.displayName || user?.email} · ${roleNames[user?.role] || user?.role}`}><span className="topbar-avatar" aria-hidden="true">{initials}</span><span className="topbar-user-copy"><strong>{user?.displayName || user?.email}</strong><small>{roleNames[user?.role] || 'Equipo'}</small></span></div>
            <button className="logout-button" type="button" onClick={handleLogout} disabled={loggingOut} aria-label="Cerrar sesión">{loggingOut ? 'Saliendo…' : 'Salir'} <span aria-hidden="true">↗</span></button>
            <Link className="button button-primary topbar-action" to="/pedidos/nuevo"><span aria-hidden="true">＋</span> Nuevo pedido</Link>
          </div>
        </header>
        {logoutError && <div className="logout-error" role="alert">{logoutError}</div>}
        <main className="main-content"><Outlet /></main>
        <footer className="footer"><span><strong>Grano & Hoja</strong> <span className="footer-dot">·</span> Panel de gestión</span><span>Hecho con cuidado, servido con calma.</span></footer>
      </div>
    </div>
  );
}
