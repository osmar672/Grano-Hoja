import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api.js';
import MetricCard from '../components/MetricCard.jsx';
import LoadingState from '../components/LoadingState.jsx';
import ErrorMessage from '../components/ErrorMessage.jsx';
import EmptyState from '../components/EmptyState.jsx';
import { roleNames } from '../auth/roleNames.js';
import { useAuth } from '../auth/AuthProvider.jsx';

const money = (value) => new Intl.NumberFormat('es-CR', { style: 'currency', currency: 'CRC', maximumFractionDigits: 2 }).format(Number(value || 0));
const dateTime = (value) => value ? new Intl.DateTimeFormat('es-CR', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) : 'Nunca';
const actionLabels = {
  'user.created': 'Usuario creado', 'user.updated': 'Usuario actualizado',
  'product.created': 'Producto creado', 'product.updated': 'Producto actualizado',
  'product.patched': 'Producto actualizado', 'product.deleted': 'Producto eliminado',
  'sale.created': 'Venta registrada', 'sale.confirmed': 'Venta confirmada', 'sale.cancelled': 'Venta anulada',
};

function QuickAction({ to, icon, title, description }) {
  return <Link className="admin-action-card" to={to}><span className="admin-action-icon" aria-hidden="true">{icon}</span><span><strong>{title}</strong><small>{description}</small></span><span className="admin-action-arrow" aria-hidden="true">↗</span></Link>;
}

function UserRow({ user, onSaved }) {
  const { user: currentUser } = useAuth();
  const isSelf = Number(currentUser?.id) === Number(user.id);
  const [role, setRole] = useState(user.role);
  const [active, setActive] = useState(user.active);
  const [password, setPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const changed = role !== user.role || active !== user.active;

  async function saveChanges(event) {
    event.preventDefault(); setError(''); setSuccess('');
    if (user.active && !active && !window.confirm(`¿Desactivar la cuenta de ${user.display_name}? Sus nuevas peticiones protegidas serán rechazadas.`)) {
      setActive(user.active); return;
    }
    setSaving(true);
    try { await api.patch(`/admin/users/${user.id}`, { role, active }); setSuccess('Permisos actualizados.'); onSaved(); }
    catch (cause) { setError(cause.message); }
    finally { setSaving(false); }
  }

  async function resetPassword(event) {
    event.preventDefault(); setSaving(true); setError(''); setSuccess('');
    try {
      await api.patch(`/admin/users/${user.id}`, { password });
      setPassword(''); setResetOpen(false); setSuccess('Contraseña actualizada.'); onSaved();
    } catch (cause) { setError(cause.message); }
    finally { setSaving(false); }
  }

  return <article className="admin-user-row">
    <div className="admin-user-identity"><span className="admin-user-avatar">{(user.display_name || user.email).slice(0, 1).toUpperCase()}</span><span className="admin-user-name"><strong>{user.display_name}</strong><small>{user.email}</small><span className={`status-pill ${user.active ? 'status-good' : 'status-danger'}`}>{user.active ? 'Activo' : 'Desactivado'}</span></span></div>
    <div className="admin-user-meta"><small>Perfil</small><strong>{roleNames[user.role] || user.role}</strong><small>Último acceso: {dateTime(user.last_login_at)}</small>{user.google_linked && <span className="admin-provider">Google conectado</span>}{user.temporarily_locked && <span className="status-pill status-warning">Bloqueo temporal</span>}</div>
    <form className="admin-user-controls" onSubmit={saveChanges}>
      <label className="compact-field">Rol<select value={role} disabled={isSelf} onChange={(event) => setRole(event.target.value)}><option value="caja">Caja</option><option value="encargado">Encargado</option><option value="admin">Administrador</option></select></label>
      <label className="admin-toggle"><input type="checkbox" checked={active} disabled={isSelf} onChange={(event) => setActive(event.target.checked)}/><span>Cuenta activa</span></label>
      <div className="admin-user-buttons"><button className="button button-primary button-small" type="submit" disabled={!changed || saving}>{saving ? 'Guardando…' : 'Guardar'}</button><button className="button button-secondary button-small" type="button" onClick={() => { setResetOpen((value) => !value); setError(''); setSuccess(''); }}>{resetOpen ? 'Cancelar clave' : 'Restablecer clave'}</button></div>
    </form>
    {isSelf && <p className="admin-inline-note">Esta es tu cuenta actual: el panel no permite cambiar tu propio rol ni desactivarte.</p>}
    {resetOpen && <form className="admin-password-reset" onSubmit={resetPassword}><label className="field">Nueva contraseña<input type="password" autoComplete="new-password" minLength={12} maxLength={72} required value={password} onChange={(event) => setPassword(event.target.value)} placeholder="12 caracteres o más"/><small>Debe contener mayúsculas, minúsculas y números. Se almacena con bcrypt.</small></label><button type="submit" className="button button-primary button-small" disabled={saving || !password}>{saving ? 'Actualizando…' : 'Confirmar cambio'}</button></form>}
    {error && <div className="admin-inline-error" role="alert">{error}</div>}{success && <p className="admin-inline-success" role="status">{success}</p>}
  </article>;
}

export default function AdminPage() {
  const [overview, setOverview] = useState(null);
  const [users, setUsers] = useState([]);
  const [audit, setAudit] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');
  const [createSuccess, setCreateSuccess] = useState('');
  const [newUser, setNewUser] = useState({ displayName: '', email: '', password: '', role: 'caja' });

  const usersPath = useMemo(() => {
    const params = new URLSearchParams();
    if (search.trim()) params.set('q', search.trim());
    if (roleFilter) params.set('role', roleFilter);
    if (statusFilter) params.set('status', statusFilter);
    params.set('limit', '100');
    return `/admin/users?${params.toString()}`;
  }, [search, roleFilter, statusFilter]);

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const [overviewResult, usersResult, auditResult] = await Promise.all([
        api.get('/admin/overview'), api.get(usersPath), api.get('/admin/audit?limit=30'),
      ]);
      setOverview(overviewResult.data); setUsers(usersResult.data || []); setAudit(auditResult.data || []);
    } catch (cause) { setError(cause.message || 'No se pudo cargar el panel de administración.'); }
    finally { setLoading(false); }
  }, [usersPath]);

  useEffect(() => { load(); }, [load, refreshKey]);
  function refresh() { setRefreshKey((value) => value + 1); }

  async function handleCreateUser(event) {
    event.preventDefault(); setCreating(true); setCreateError(''); setCreateSuccess('');
    try {
      await api.post('/admin/users', newUser);
      setNewUser({ displayName: '', email: '', password: '', role: 'caja' });
      setCreateSuccess('Usuario creado correctamente.'); refresh();
    } catch (cause) { setCreateError(cause.message || 'No se pudo crear la cuenta.'); }
    finally { setCreating(false); }
  }

  return <div className="page-stack admin-page">
    <section className="botanical-hero admin-hero"><div><span className="eyebrow">ADMINISTRACIÓN · GRANO & HOJA</span><h1>Cuida cada detalle de la cafetería.</h1><p>Gestiona accesos, controla ingredientes y revisa las operaciones de la cafetería.</p></div><span className="admin-hero-mark" aria-hidden="true">✿</span></section>

    {error && <ErrorMessage error={{ message: error, status: 0 }} onRetry={load} />}
    {loading && !overview ? <LoadingState message="Cargando herramientas de administración…" /> : <>
      <section className="metric-grid admin-metrics" aria-label="Resumen de administración">
        <MetricCard label="Usuarios activos" value={overview?.active_users ?? '—'} note={`${overview?.inactive_users ?? 0} cuentas desactivadas`} icon="♙" />
        <MetricCard label="Administradores activos" value={overview?.active_admins ?? '—'} note="Debe existir al menos uno" icon="⌑" />
        <MetricCard label="Productos publicados" value={overview?.active_products ?? '—'} note="Catálogo visible en ventas" icon="✿" />
        <MetricCard label="Insumos bajos" value={overview?.low_stock_ingredients ?? '—'} note="Ingredientes al mínimo o agotados" icon="⚑" />
        <MetricCard label="Ventas de hoy" value={money(overview?.sales_today_total)} note={`${overview?.sales_today_count ?? 0} ventas confirmadas`} icon="↗" />
      </section>
      <section className="admin-quick-actions">
        <QuickAction to="/productos" icon="✿" title="Gestionar catálogo" description="Crear y mantener bebidas y repostería" />
        <QuickAction to="/inventario" icon="❋" title="Revisar insumos" description="Detectar ingredientes por reponer" />
        <QuickAction to="/pedidos" icon="↗" title="Consultar ventas" description="Historial, confirmaciones y anulaciones" />
        <QuickAction to="/asistente-compras" icon="✦" title="Asistente de reposición" description="Sugerencias de compra con IA" />
      </section>

      <section className="panel-card admin-users-panel" id="usuarios">
        <div className="section-heading"><div><span className="eyebrow">ACCESO Y PERMISOS</span><h2>Usuarios de la tienda</h2><p>Crea cuentas, cambia sus roles, desactiva accesos y restablece contraseñas.</p></div><span className="admin-count">{users.length} cuentas</span></div>
        <form className="admin-create-form" onSubmit={handleCreateUser}>
          <div className="admin-create-title"><span className="admin-section-icon">＋</span><div><strong>Crear cuenta local</strong><small>Las cuentas nuevas no tienen permisos de administrador salvo que elijas ese rol aquí.</small></div></div>
          <div className="admin-create-grid">
            <label className="field">Nombre completo<input required maxLength={120} value={newUser.displayName} onChange={(event) => setNewUser({ ...newUser, displayName: event.target.value })} autoComplete="name"/></label>
            <label className="field">Correo electrónico<input required type="email" maxLength={254} value={newUser.email} onChange={(event) => setNewUser({ ...newUser, email: event.target.value })} autoComplete="email"/></label>
            <label className="field">Contraseña inicial<input required type="password" minLength={12} maxLength={72} value={newUser.password} onChange={(event) => setNewUser({ ...newUser, password: event.target.value })} autoComplete="new-password"/><small>12 caracteres o más, con mayúscula, minúscula y número.</small></label>
            <label className="field">Rol inicial<select value={newUser.role} onChange={(event) => setNewUser({ ...newUser, role: event.target.value })}><option value="caja">Caja</option><option value="encargado">Encargado</option><option value="admin">Administrador</option></select></label>
          </div>
          <div className="admin-create-actions"><button className="button button-primary" disabled={creating} type="submit">{creating ? 'Creando cuenta…' : 'Crear usuario'}</button>{createError && <span className="admin-inline-error" role="alert">{createError}</span>}{createSuccess && <span className="admin-inline-success" role="status">{createSuccess}</span>}</div>
        </form>

        <div className="filter-bar admin-user-filters"><label className="search-field"><span aria-hidden="true">⌕</span><input type="search" placeholder="Buscar por nombre o correo" value={search} onChange={(event) => setSearch(event.target.value)} /></label><label className="compact-field">Rol<select value={roleFilter} onChange={(event) => setRoleFilter(event.target.value)}><option value="">Todos</option><option value="admin">Administrador</option><option value="encargado">Encargado</option><option value="caja">Caja</option></select></label><label className="compact-field">Estado<select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}><option value="">Todos</option><option value="active">Activos</option><option value="inactive">Desactivados</option></select></label><button className="button button-secondary button-small" type="button" onClick={refresh}>Actualizar</button></div>
        {loading ? <LoadingState message="Actualizando usuarios…" /> : users.length === 0 ? <EmptyState title="No hay usuarios">Prueba con otros filtros o crea una cuenta nueva.</EmptyState> : <div className="admin-user-list">{users.map((user) => <UserRow key={user.id} user={user} onSaved={refresh} />)}</div>}
      </section>

      <section className="panel-card admin-audit-panel" id="actividad">
        <div className="section-heading"><div><span className="eyebrow">TRAZABILIDAD</span><h2>Actividad reciente</h2><p>Registros administrativos de cuentas, catálogo y ventas. No se guardan contraseñas ni tokens.</p></div><span className="admin-count">Últimos {audit.length}</span></div>
        {loading ? <LoadingState message="Cargando actividad…" /> : audit.length === 0 ? <EmptyState title="Todavía no hay actividad registrada">Los nuevos cambios aparecerán aquí después de aplicar la migración de administración.</EmptyState> : <div className="admin-audit-list">{audit.map((event) => <article className="admin-audit-item" key={event.id}><span className="admin-audit-dot"/><div className="admin-audit-copy"><strong>{actionLabels[event.action] || event.action}</strong><small>{event.actor_name || 'Cuenta eliminada'} · {roleNames[event.actor_role] || event.actor_role || 'Sistema'}{event.resource_id ? ` · Registro #${event.resource_id}` : ''}</small></div><time dateTime={event.created_at}>{dateTime(event.created_at)}</time></article>)}</div>}
      </section>
    </>}
  </div>;
}
