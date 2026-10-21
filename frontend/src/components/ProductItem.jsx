import { Link } from 'react-router-dom';
const money = (value) => new Intl.NumberFormat('es-CR', { style: 'currency', currency: 'CRC', maximumFractionDigits: 2 }).format(Number(value || 0));
export default function ProductItem({ product, onDelete }) {
  return <article className="entity-row product-row">
    <div className="entity-avatar">{product.nombre.slice(0, 1).toUpperCase()}</div>
    <div className="entity-main"><div className="entity-title-line"><strong>{product.nombre}</strong><span className={`status-pill ${product.disponible ? 'status-good' : 'status-danger'}`}>{product.disponible ? 'Disponible' : 'Sin insumos'}</span></div><small>{product.categoria} · {product.porciones_disponibles ?? 0} porciones estimadas</small></div>
    <strong className="entity-price">{money(product.precio)}</strong>
    <div className="row-actions"><Link className="text-link" to={`/productos/${product.id}`}>Detalle</Link><Link className="text-link" to={`/productos/${product.id}/editar`}>Editar</Link><button className="text-link danger-link" onClick={() => onDelete(product)}>Eliminar</button></div>
  </article>;
}
