import { useState } from 'react';
import { NavLink, Link, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider.jsx';
import { can } from '../auth/permissions.js';
import { roleNames } from '../auth/roleNames.js';
import LogoMark from './LogoMark.jsx';

const navigation = [
  { to: '/', label: 'Panel', caption: 'Resumen del día', icon: '⌂', end: true },
  { to: '/productos', label: 'Catálogo', caption: 'Café y repostería', icon: '✿' },
  { to: '/insumos', label: 'Insumos', caption: 'Insumos y stock', icon: '◉', permission: 'viewIngredients' },
  { to: '/pedidos', label: 'Ventas', caption: 'Historial', icon: '↗' },
  { to: '/asistente-compras', label: 'Asistente IA', caption: 'Reposición', icon: '✦' },
  { to: '/admin', label: 'Admin', caption: 'Usuarios y control', icon: '⚙', adminOnly: true },
];

export default function Layout() {
  const { user, logout } = useAuth(); const navigate = useNavigate();
  const [loggingOut, setLoggingOut] = useState(false); const [logoutError, setLogoutError] = useState('');
  async function handleLogout() {
    setLoggingOut(true); setLogoutError('');
    try { await logout(); navigate('/login', { replace: true }); }
    catch { setLogoutError('No se pudo cerrar la sesión. Comprueba la conexión e inténtalo de nuevo.'); }
    finally { setLoggingOut(false); }
  }
  const initials = (user?.displayName || user?.email || 'RM').split(/[\s@._-]+/).filter(Boolean).slice(0,2).map((part) => part[0].toUpperCase()).join('');
  const visibleNavigation = navigation.filter((item) => {
    if (item.adminOnly && !can(user, 'adminPanel')) return false;
    if (item.permission && !can(user, item.permission)) return false;
    if (item.to === '/asistente-compras' && !can(user, 'purchaseAssistant')) return false;
    return true;
  });
  return <div className="app-shell">
    <aside className="sidebar">
      <Link className="brand" to="/" aria-label="Grano & Hoja, ir al panel"><span className="brand-mark"><LogoMark /></span><span className="brand-copy"><strong>Grano <i>&</i> Hoja</strong><small>CAFÉ · BEBIDAS · REPOSTERÍA</small></span></Link>
      <div className="sidebar-section-label">LA CAFETERÍA</div>
      <nav className={`main-nav nav-count-${visibleNavigation.length}`} aria-label="Navegación principal">{visibleNavigation.map((item) => <NavLink key={item.to} to={item.to} end={item.end} className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}><span className="nav-icon" aria-hidden="true">{item.icon}</span><span className="nav-copy"><strong>{item.label}</strong><small>{item.caption}</small></span><span className="nav-chevron" aria-hidden="true">↗</span></NavLink>)}</nav>
      <div className="sidebar-spacer" />
      <div className="sidebar-note"><div className="sidebar-note-icon"><LogoMark /></div><div><strong>Una pausa para disfrutar</strong><p>Café bien preparado e ingredientes de calidad.</p></div></div>
      <div className="sidebar-footer"><span className="sidebar-footer-dot" /> GRANO & HOJA <span>·</span> GESTIÓN</div>
    </aside>
    <div className="workspace">
      <header className="workspace-topbar"><div className="workspace-context"><span className="context-mark">RM</span><div><span className="context-kicker">UN HOGAR EN EQUILIBRIO</span><strong>Espacio de gestión</strong></div></div>
        <div className="topbar-tools">{can(user, 'adminPanel') && <Link className="topbar-admin-link" to="/admin" aria-label="Abrir administración">⚙ Admin</Link>}<span className="topbar-motto"><span aria-hidden="true">✧</span> Una pausa bien hecha</span><div className="topbar-user" title={`${user?.displayName || user?.email} · ${roleNames[user?.role] || user?.role}`}><span className="topbar-avatar">{initials}</span><span className="topbar-user-copy"><strong>{user?.displayName || user?.email}</strong><small>{roleNames[user?.role] || 'Equipo'}</small></span></div><button className="logout-button" type="button" onClick={handleLogout} disabled={loggingOut} aria-label="Cerrar sesión">{loggingOut ? 'Saliendo…' : 'Salir'} <span aria-hidden="true">↗</span></button><Link className="button button-primary topbar-action" to="/pedidos/nuevo"><span aria-hidden="true">＋</span> Nueva venta</Link></div>
      </header>
      {logoutError && <div className="logout-error" role="alert">{logoutError}</div>}
      <main className="main-content"><Outlet /></main>
      <footer className="footer"><span><strong>Grano & Hoja</strong> <span className="footer-dot">·</span> Café, bebidas y repostería</span><span>Buen café, buenos ingredientes.</span></footer>
    </div>
  </div>;
}
