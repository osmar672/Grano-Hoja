import { Link, useParams } from 'react-router-dom';
import { useFetch } from '../hooks/useFetch.js';
import LoadingState from '../components/LoadingState.jsx';
import ErrorMessage from '../components/ErrorMessage.jsx';
import EmptyState from '../components/EmptyState.jsx';
const money = (value) => new Intl.NumberFormat('es-CR', { style: 'currency', currency: 'CRC' }).format(Number(value || 0));
export default function ProductDetailPage() {
  const { id } = useParams();
  const { data, loading, error, refetch } = useFetch(`/productos/${id}`);
  if (loading) return <LoadingState message="Cargando producto y receta…" />;
  if (error) return <div className="page-stack"><ErrorMessage error={error} onRetry={refetch} /><Link to="/productos" className="text-link">← Volver al menú</Link></div>;
  if (!data) return <EmptyState title="Producto no encontrado" />;
  return <section className="page-stack narrow-page">
    <Link className="back-link" to="/productos">← Volver a productos</Link>
    <div className="detail-hero"><div className="detail-avatar">{data.nombre.slice(0, 1)}</div><div className="detail-intro"><span className="eyebrow">{data.categoria}</span><h1>{data.nombre}</h1><p>{money(data.precio)} por porción</p><span className={`status-pill ${data.disponible ? 'status-good' : 'status-danger'}`}>{data.disponible ? 'Disponible' : 'No disponible con el stock actual'}</span></div><Link className="button button-secondary" to={`/productos/${data.id}/editar`}>Editar producto</Link></div>
    <section className="panel-card"><div className="section-heading"><div><span className="eyebrow">PREPARACIÓN</span><h2>Receta por porción</h2></div><div className="portion-count"><strong>{data.porciones_disponibles}</strong><small>porciones posibles</small></div></div>
      {data.receta.length ? <div className="recipe-table">{data.receta.map((ingredient) => <div className="recipe-detail-row" key={ingredient.insumo_id}><div><strong>{ingredient.insumo}</strong><small>Stock: {ingredient.stock} {ingredient.unidad}</small></div><strong>{ingredient.cantidad} {ingredient.unidad}</strong></div>)}</div> : <EmptyState title="Este producto no tiene receta" />}
    </section>
  </section>;
}
