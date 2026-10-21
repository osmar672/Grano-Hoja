import { NavLink, Link, Outlet } from 'react-router-dom';

const navigation = [
  { to: '/', label: 'Panel', caption: 'Resumen del día', icon: '◫', end: true },
  { to: '/productos', label: 'Productos', caption: 'Menú y recetas', icon: '✳' },
  { to: '/insumos', label: 'Insumos', caption: 'Inventario', icon: '❋' },
  { to: '/pedidos', label: 'Pedidos', caption: 'Ventas e historial', icon: '↗' },
  { to: '/asistente-compras', label: 'Asistente IA', caption: 'Sugerencias de compra', icon: '✦' },
];

export default function Layout() {
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Link className="brand" to="/" aria-label="Grano & Hoja, ir al panel">
          <span className="brand-mark" aria-hidden="true">
            <span className="brand-mark-leaf">❧</span>
          </span>
          <span className="brand-copy">
            <strong>Grano <i>&</i> Hoja</strong>
            <small>CAFÉ · INVENTARIO · CUIDADO</small>
          </span>
        </Link>

        <div className="sidebar-section-label">ESPACIO DE TRABAJO</div>
        <nav className="main-nav" aria-label="Navegación principal">
          {navigation.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}
            >
              <span className="nav-icon" aria-hidden="true">{item.icon}</span>
              <span className="nav-copy">
                <strong>{item.label}</strong>
                <small>{item.caption}</small>
              </span>
              <span className="nav-chevron" aria-hidden="true">↗</span>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-spacer" />
        <div className="sidebar-note">
          <div className="sidebar-note-icon" aria-hidden="true">❧</div>
          <div>
            <strong>De la finca a la taza</strong>
            <p>Cada ingrediente cuenta. Cada detalle también.</p>
          </div>
        </div>
        <div className="sidebar-footer"><span className="sidebar-footer-dot" /> GRANO & HOJA <span>·</span> GESTIÓN
        </div>
      </aside>

      <div className="workspace">
        <header className="workspace-topbar">
          <div className="workspace-context">
            <span className="context-mark" aria-hidden="true">GH</span>
            <div><span className="context-kicker">TU CAFETERÍA, EN EQUILIBRIO</span><strong>Espacio de operación</strong></div>
          </div>
          <div className="topbar-tools">
            <span className="topbar-motto"><span aria-hidden="true">✧</span> Hecho con calma</span>
            <Link className="button button-primary topbar-action" to="/pedidos/nuevo"><span aria-hidden="true">＋</span> Nuevo pedido</Link>
          </div>
        </header>

        <main className="main-content"><Outlet /></main>
        <footer className="footer">
          <span><strong>Grano & Hoja</strong> <span className="footer-dot">·</span> Panel de gestión</span>
          <span>Hecho con cuidado, servido con calma.</span>
        </footer>
      </div>
    </div>
  );
}
