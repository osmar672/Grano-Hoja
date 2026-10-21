import { Link } from 'react-router-dom';
import { useFetch } from '../hooks/useFetch.js';
import MetricCard from '../components/MetricCard.jsx';
import LoadingState from '../components/LoadingState.jsx';
import ErrorMessage from '../components/ErrorMessage.jsx';
import EmptyState from '../components/EmptyState.jsx';
import LogoMark from '../components/LogoMark.jsx';
const money=(v)=>new Intl.NumberFormat('es-CR',{style:'currency',currency:'CRC'}).format(Number(v||0));
function todayLocal(){const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Costa_Rica',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());const values=Object.fromEntries(parts.map((p)=>[p.type,p.value]));return `${values.year}-${values.month}-${values.day}`;}
export default function DashboardPage(){
  const {data,loading,error,refetch}=useFetch(`/resumen?fecha=${todayLocal()}`);
  const {data:lowStock,loading:lowLoading,error:lowError,refetch:refetchLow}=useFetch('/reportes/productos-bajo-stock');
  return <section className="page-stack">
    <div className="page-hero botanical-hero"><div><span className="eyebrow">RAÍZ & MADERA · {todayLocal()}</span><h1>Un buen día para crecer.</h1><p>Ventas, productos y existencias de tu tienda en equilibrio.</p><div className="hero-actions"><Link className="button button-primary" to="/pedidos/nuevo">＋ Registrar venta</Link><Link className="button button-secondary" to="/productos/nuevo">Añadir producto</Link></div></div><div className="hero-botanical-mark" aria-hidden="true"><LogoMark/></div></div>
    <ErrorMessage error={error} onRetry={refetch}/>
    {loading?<LoadingState message="Preparando resumen de ventas…"/>:data&&<>
      <div className="metric-grid"><MetricCard label="Ventas de hoy" value={money(data.total_general)} note={`${data.cantidad_pedidos} ventas confirmadas`} icon="₡"/>{['efectivo','tarjeta','sinpe_movil'].map((method)=>{const row=data.por_metodo_pago.find((item)=>item.metodo_pago===method);return <MetricCard key={method} label={method==='sinpe_movil'?'SINPE Móvil':method[0].toUpperCase()+method.slice(1)} value={money(row?.total)} note={`${row?.cantidad_pedidos||0} ventas`} icon={method==='efectivo'?'＄':method==='tarjeta'?'▤':'↗'}/>;})}</div>
      <div className="dashboard-grid"><section className="panel-card"><div className="section-heading"><div><span className="eyebrow">LO MÁS ELEGIDO</span><h2>Productos más vendidos</h2></div><Link className="text-link" to="/pedidos">Ver ventas →</Link></div>
        {data.productos_mas_vendidos.length?<div className="top-products">{data.productos_mas_vendidos.map((product,index)=><div className="top-product" key={product.producto_id}><span className="rank-number">{String(index+1).padStart(2,'0')}</span><div className="top-product-info"><strong>{product.nombre}</strong><small>{product.unidades_vendidas} unidades</small></div><strong>{money(product.total_vendido)}</strong></div>)}</div>:<EmptyState title="Todavía no hay ventas confirmadas"/>}</section>
        <section className="panel-card stock-alert-panel"><div className="section-heading"><div><span className="eyebrow">EXISTENCIAS</span><h2>Necesitan reposición</h2></div><Link className="text-link" to="/inventario">Ver inventario →</Link></div>
          {lowError?<ErrorMessage error={lowError} onRetry={refetchLow}/>:lowLoading?<p className="muted-text">Revisando existencias…</p>:lowStock?.length?<div className="alert-list">{lowStock.slice(0,6).map((item)=><div className="alert-item" key={item.id}><span className="alert-symbol">!</span><div><strong>{item.nombre}</strong><small>{item.stock} disponibles · mínimo {item.stock_minimo}</small></div><span className="status-pill status-warning">Reponer</span></div>)}</div>:<p className="success-note">Todo el inventario está sobre el mínimo.</p>}</section>
      </div>
    </>}
  </section>;
}
