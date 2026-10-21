import { NavLink, Outlet } from 'react-router-dom';

const navigation = [
  { to: '/', label: 'Panel', end: true },
  { to: '/productos', label: 'Productos' },
  { to: '/insumos', label: 'Insumos' },
  { to: '/pedidos', label: 'Pedidos' },
  { to: '/asistente-compras', label: 'Asistente IA' },
];

export default function Layout() {
  return <div className="app-shell">
    <header className="topbar">
      <NavLink className="brand" to="/" aria-label="Grano & Hoja, ir al panel">
        <span className="brand-mark" aria-hidden="true">G<span>&</span>H</span>
        <span><strong>Grano & Hoja</strong><small>Cafetería · punto de venta</small></span>
      </NavLink>
      <nav className="main-nav" aria-label="Navegación principal">
        {navigation.map((item) => <NavLink key={item.to} to={item.to} end={item.end} className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>{item.label}</NavLink>)}
      </nav>
      <NavLink className="button button-primary topbar-action" to="/pedidos/nuevo">＋ Nuevo pedido</NavLink>
    </header>
    <main className="main-content"><Outlet /></main>
    <footer className="footer"><span>Grano & Hoja</span><span>Hecho con cuidado, servido con calma.</span></footer>
  </div>;
}
