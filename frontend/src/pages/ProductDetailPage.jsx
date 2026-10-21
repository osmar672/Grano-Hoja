import { Link, useParams } from 'react-router-dom';
import { useFetch } from '../hooks/useFetch.js';
import LoadingState from '../components/LoadingState.jsx';
import ErrorMessage from '../components/ErrorMessage.jsx';
import EmptyState from '../components/EmptyState.jsx';
import { useAuth } from '../auth/AuthProvider.jsx';
import { can } from '../auth/permissions.js';
const money=(v)=>new Intl.NumberFormat('es-CR',{style:'currency',currency:'CRC'}).format(Number(v||0));
const labels={plantas:'Plantas',muebles:'Muebles',decoracion:'Decoración'};
const marks={plantas:'♧',muebles:'⌂',decoracion:'✳'};
export default function ProductDetailPage(){
  const {id}=useParams(); const {user}=useAuth(); const canManage=can(user,'manageCatalog'); const {data,loading,error,refetch}=useFetch(`/productos/${id}`);
  if(loading)return <LoadingState message="Cargando ficha de producto…"/>;
  if(error)return <div className="page-stack"><ErrorMessage error={error} onRetry={refetch}/><Link to="/productos" className="text-link">← Volver al catálogo</Link></div>;
  if(!data)return <EmptyState title="Producto no encontrado"/>;
  return <section className="page-stack narrow-page"><Link className="back-link" to="/productos">← Volver al catálogo</Link>
    <div className="detail-hero"><div className={`detail-avatar category-${data.categoria}`}>{marks[data.categoria]}</div><div className="detail-intro"><span className="eyebrow">{labels[data.categoria]||data.categoria}</span><h1>{data.nombre}</h1><p>{money(data.precio)}</p><span className={`status-pill ${data.stock>0&&data.activo?'status-good':'status-danger'}`}>{data.stock>0&&data.activo?'Disponible':'Agotado o inactivo'}</span></div>{canManage&&<Link className="button button-secondary" to={`/productos/${data.id}/editar`}>Editar producto</Link>}</div>
    <section className="panel-card"><div className="section-heading"><div><span className="eyebrow">DETALLES</span><h2>Una pieza para tu espacio</h2></div><span className="status-pill status-neutral">{data.activo?'Activo':'Pausado'}</span></div><p className="detail-description">{data.descripcion||'Este producto todavía no tiene una descripción.'}</p><div className="product-stats-grid"><div><small>Existencias</small><strong>{data.stock}</strong><span>unidades disponibles</span></div><div><small>Mínimo ideal</small><strong>{data.stock_minimo}</strong><span>umbral de reposición</span></div><div><small>Ventas últimos 30 días</small><strong>{data.unidades_vendidas_30_dias||0}</strong><span>unidades vendidas</span></div></div>{data.bajo_stock&&<p className="stock-inline-alert">Este producto está por debajo del mínimo de reposición.</p>}</section>
  </section>;
}
