import { useMemo,useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api.js';
import { useFetch } from '../hooks/useFetch.js';
import LoadingState from '../components/LoadingState.jsx';
import ErrorMessage from '../components/ErrorMessage.jsx';
import EmptyState from '../components/EmptyState.jsx';
const money=(v)=>new Intl.NumberFormat('es-CR',{style:'currency',currency:'CRC'}).format(Number(v||0));
const dateTime=(v)=>v?new Intl.DateTimeFormat('es-CR',{dateStyle:'medium',timeStyle:'short',timeZone:'America/Costa_Rica'}).format(new Date(v)):'—';
export default function OrdersPage(){
  const [status,setStatus]=useState('');const [payment,setPayment]=useState('');const [actionError,setActionError]=useState(null);const [busyId,setBusyId]=useState(null);
  const path=useMemo(()=>`/pedidos?${new URLSearchParams({estado:status,metodo_pago:payment})}`,[status,payment]);const {data,loading,error,refetch}=useFetch(path);
  const act=async(order,action)=>{if(action==='anular'&&!window.confirm(`¿Anular la venta #${order.id}? Las ventas confirmadas solo se pueden anular durante los primeros 15 minutos.`))return;setBusyId(order.id);setActionError(null);try{await api.post(`/pedidos/${order.id}/${action}`,{});refetch();}catch(e){setActionError(e);}finally{setBusyId(null);}};
  return <section className="page-stack"><div className="page-hero"><div><span className="eyebrow">HISTORIAL DEL NEGOCIO</span><h1>Ventas</h1><p>Revisa ventas, pagos y anulaciones manteniendo el historial.</p></div><Link className="button button-primary" to="/pedidos/nuevo">＋ Nueva venta</Link></div>
    {actionError&&<ErrorMessage error={actionError}/>}<div className="filter-bar"><label className="compact-field"><span>Estado</span><select value={status} onChange={(e)=>setStatus(e.target.value)}><option value="">Todos</option><option value="pendiente">Pendiente</option><option value="confirmado">Confirmada</option><option value="anulado">Anulada</option></select></label><label className="compact-field"><span>Método de pago</span><select value={payment} onChange={(e)=>setPayment(e.target.value)}><option value="">Todos</option><option value="efectivo">Efectivo</option><option value="tarjeta">Tarjeta</option><option value="sinpe_movil">SINPE Móvil</option></select></label></div>
    {error&&<ErrorMessage error={error} onRetry={refetch}/ >}{loading?<LoadingState message="Cargando ventas…"/>:data?.length?<div className="orders-list">{data.map((order)=><article className="order-card" key={order.id}><div className="order-head"><div><span className="order-id">VENTA #{order.id}</span><small>{dateTime(order.fecha)}</small></div><span className={`status-pill ${order.estado==='confirmado'?'status-good':order.estado==='pendiente'?'status-warning':'status-neutral'}`}>{order.estado}</span></div>
      <div className="order-summary"><div><small>Pago</small><strong>{order.metodo_pago==='sinpe_movil'?'SINPE Móvil':order.metodo_pago}</strong></div><div><small>Subtotal</small><strong>{money(order.subtotal)}</strong></div><div><small>Impuesto (13%)</small><strong>{money(order.impuesto)}</strong></div><div><small>Total</small><strong className="order-total">{money(order.total)}</strong></div></div>
      <div className="order-items">{(order.items||[]).map((item,index)=><span key={`${order.id}-${item.producto_id}-${index}`}>{item.cantidad} × {item.nombre}</span>)}</div>
      <div className="order-actions">{order.estado==='pendiente'&&<button className="button button-primary button-small" disabled={busyId===order.id} onClick={()=>act(order,'confirmar')}>{busyId===order.id?'Procesando…':'Confirmar venta'}</button>}{order.estado==='pendiente'&&<button className="button button-quiet button-small" disabled={busyId===order.id} onClick={()=>act(order,'anular')}>Anular pendiente</button>}{order.estado==='confirmado'&&<><span className="window-note">{order.dentro_plazo_anulacion?'Dentro del plazo de 15 min':'Plazo de anulación vencido'}</span><button className="button button-quiet button-small" disabled={!order.dentro_plazo_anulacion||busyId===order.id} onClick={()=>act(order,'anular')}>Anular venta</button></>}</div>
    </article>)}</div>:<EmptyState title="No hay ventas con estos filtros">Registra una nueva venta para comenzar el historial.</EmptyState>}
  </section>;
}
