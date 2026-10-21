import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api.js';
import { useFetch } from '../hooks/useFetch.js';
import LoadingState from '../components/LoadingState.jsx';
import ErrorMessage from '../components/ErrorMessage.jsx';
import EmptyState from '../components/EmptyState.jsx';
const money = (value) => new Intl.NumberFormat('es-CR', { style: 'currency', currency: 'CRC' }).format(Number(value || 0));
const dateTime = (value) => value ? new Intl.DateTimeFormat('es-CR', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'America/Costa_Rica' }).format(new Date(value)) : '—';
export default function OrdersPage() {
  const [status, setStatus] = useState(''); const [payment, setPayment] = useState(''); const [actionError, setActionError] = useState(null); const [busyId, setBusyId] = useState(null);
  const path = useMemo(() => `/pedidos?${new URLSearchParams({ estado: status, metodo_pago: payment })}`, [status, payment]);
  const { data, loading, error, refetch } = useFetch(path);
  const act = async (order, action) => {
    const label = action === 'confirmar' ? 'confirmar' : 'anular';
    if (action === 'anular' && !window.confirm(`¿Anular el pedido #${order.id}? Si se confirmó hace más de 15 minutos, la API lo rechazará.`)) return;
    setBusyId(order.id); setActionError(null);
    try { await api.post(`/pedidos/${order.id}/${action}`, {}); refetch(); }
    catch (requestError) { setActionError(requestError); }
    finally { setBusyId(null); }
  };
  return <section className="page-stack">
    <div className="page-hero"><div><span className="eyebrow">HISTORIAL DE VENTAS</span><h1>Pedidos</h1><p>Confirma las preparaciones y conserva el historial de caja.</p></div><Link className="button button-primary" to="/pedidos/nuevo">＋ Nuevo pedido</Link></div>
    {actionError && <ErrorMessage error={actionError} />}
    <div className="filter-bar"><label className="compact-field"><span>Estado</span><select value={status} onChange={(e) => setStatus(e.target.value)}><option value="">Todos</option><option value="pendiente">Pendiente</option><option value="confirmado">Confirmado</option><option value="anulado">Anulado</option></select></label><label className="compact-field"><span>Método de pago</span><select value={payment} onChange={(e) => setPayment(e.target.value)}><option value="">Todos</option><option value="efectivo">Efectivo</option><option value="tarjeta">Tarjeta</option><option value="sinpe_movil">SINPE Móvil</option></select></label></div>
    {error && <ErrorMessage error={error} onRetry={refetch} />}
    {loading ? <LoadingState message="Cargando historial…" /> : data?.length ? <div className="orders-list">{data.map((order) => <article className="order-card" key={order.id}>
      <div className="order-head"><div><span className="order-id">PEDIDO #{order.id}</span><small>{dateTime(order.fecha)}</small></div><span className={`status-pill ${order.estado === 'confirmado' ? 'status-good' : order.estado === 'pendiente' ? 'status-warning' : 'status-neutral'}`}>{order.estado}</span></div>
      <div className="order-summary"><div><small>Pago</small><strong>{order.metodo_pago === 'sinpe_movil' ? 'SINPE Móvil' : order.metodo_pago}</strong></div><div><small>Subtotal</small><strong>{money(order.subtotal)}</strong></div><div><small>Impuesto (13%)</small><strong>{money(order.impuesto)}</strong></div><div><small>Total</small><strong className="order-total">{money(order.total)}</strong></div></div>
      <div className="order-items">{(order.items || []).map((item, index) => <span key={`${order.id}-${item.producto_id}-${index}`}>{item.cantidad} × {item.nombre}</span>)}</div>
      <div className="order-actions">{order.estado === 'pendiente' && <button className="button button-primary button-small" disabled={busyId === order.id} onClick={() => act(order, 'confirmar')}>{busyId === order.id ? 'Procesando…' : 'Confirmar pedido'}</button>}{order.estado === 'pendiente' && <button className="button button-quiet button-small" disabled={busyId === order.id} onClick={() => act(order, 'anular')}>Anular pendiente</button>}{order.estado === 'confirmado' && <><span className="window-note">{order.dentro_plazo_anulacion ? 'Dentro del plazo de 15 min' : 'Plazo de anulación vencido'}</span><button className="button button-quiet button-small" disabled={!order.dentro_plazo_anulacion || busyId === order.id} onClick={() => act(order, 'anular')}>Anular</button></>}</div>
    </article>)}</div> : <EmptyState title="No hay pedidos con esos filtros" >Crea un pedido nuevo para comenzar.</EmptyState>}
  </section>;
}
