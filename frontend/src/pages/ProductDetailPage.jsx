import { Link, useParams } from 'react-router-dom';
import { useFetch } from '../hooks/useFetch.js';
import LoadingState from '../components/LoadingState.jsx';
import ErrorMessage from '../components/ErrorMessage.jsx';
import EmptyState from '../components/EmptyState.jsx';
import { useAuth } from '../auth/AuthProvider.jsx';
import { can } from '../auth/permissions.js';
const money=(v)=>new Intl.NumberFormat('es-CR',{style:'currency',currency:'CRC'}).format(Number(v||0));
const labels={bebidas_calientes:'Bebidas calientes',bebidas_frias:'Bebidas frías',reposteria:'Repostería',comida:'Comida',plantas:'Plantas (histórica)',muebles:'Muebles (histórica)',decoracion:'Decoración (histórica)'};
const marks={bebidas_calientes:'☕',bebidas_frias:'◌',reposteria:'▱',comida:'•',plantas:'♧',muebles:'⌂',decoracion:'✳'};
export default function ProductDetailPage(){
  const {id}=useParams(); const {user}=useAuth(); const canManage=can(user,'manageCatalog');
  const {data,loading,error,refetch}=useFetch(`/productos/${id}`);
  const {data:recipe,loading:recipeLoading,error:recipeError,refetch:refetchRecipe}=useFetch(`/productos/${id}/receta`);
  if(loading||recipeLoading)return <LoadingState message="Cargando producto y receta…"/>;
  if(error)return <div className="page-stack"><ErrorMessage error={error} onRetry={refetch}/><Link to="/productos" className="text-link">← Volver al catálogo</Link></div>;
  if(!data)return <EmptyState title="Producto no encontrado"/>;
  return <section className="page-stack narrow-page"><Link className="back-link" to="/productos">← Volver al catálogo</Link>
    <div className="detail-hero"><div className={`detail-avatar category-${data.categoria}`}>{marks[data.categoria]||'•'}</div><div className="detail-intro"><span className="eyebrow">{labels[data.categoria]||data.categoria}</span><h1>{data.nombre}</h1><p>{money(data.precio)}</p><span className={`status-pill ${data.activo?'status-good':'status-danger'}`}>{data.activo?'Activo para venta':'Pausado'}</span></div>{canManage&&<Link className="button button-secondary" to={`/productos/${data.id}/editar`}>Editar producto y receta</Link>}</div>
    <section className="panel-card"><div className="section-heading"><div><span className="eyebrow">DETALLES</span><h2>Ficha del producto</h2></div><span className="status-pill status-neutral">{data.activo?'Activo':'Pausado'}</span></div><p className="detail-description">{data.descripcion||'Este producto todavía no tiene una descripción.'}</p><div className="product-stats-grid"><div><small>Precio por unidad</small><strong>{money(data.precio)}</strong><span>impuesto calculado al vender</span></div><div><small>Ventas últimos 30 días</small><strong>{data.unidades_vendidas_30_dias||0}</strong><span>unidades vendidas</span></div></div></section>
    <section className="panel-card"><div className="section-heading"><div><span className="eyebrow">INVENTARIO DE INGREDIENTES</span><h2>Receta por unidad</h2></div>{canManage&&<Link className="text-link" to={`/productos/${data.id}/editar`}>Editar receta →</Link>}</div>
      {recipeError?<ErrorMessage error={recipeError} onRetry={refetchRecipe}/>:recipe?.items?.length?<div className="top-products">{recipe.items.map((item)=><div className="top-product" key={item.insumo_id}><span className="rank-number">·</span><div className="top-product-info"><strong>{item.nombre}</strong><small>{item.activo?'Ingrediente activo':'Ingrediente inactivo'}</small></div><strong>{item.cantidad} {item.unidad}</strong></div>)}</div>:<p className="muted-text">Este producto no tiene receta. Se puede vender, pero no descontará ingredientes hasta que se defina una receta.</p>}
    </section>
  </section>;
}
