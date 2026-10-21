import { Link } from 'react-router-dom';
const money = (value) => new Intl.NumberFormat('es-CR', { style: 'currency', currency: 'CRC' }).format(Number(value || 0));
const labels = { plantas: 'Plantas', muebles: 'Muebles', decoracion: 'Decoración' };
const glyphs = { plantas: '♧', muebles: '⌂', decoracion: '✳' };
export default function ProductItem({ product, onDelete, canEdit = false, canDelete = false }) {
  return <article className="entity-row product-row">
    <div className={`entity-avatar category-${product.categoria}`} aria-hidden="true">{glyphs[product.categoria] || '✳'}</div>
    <div className="entity-main"><div className="entity-title-line"><strong>{product.nombre}</strong><span className={`status-pill ${product.stock > 0 && product.activo ? 'status-good' : 'status-danger'}`}>{product.stock > 0 && product.activo ? 'Disponible' : 'Agotado / inactivo'}</span></div><small>{labels[product.categoria] || product.categoria} · {product.stock} en stock · mínimo {product.stock_minimo}</small>{product.bajo_stock && <span className="status-pill status-warning stock-warning-pill">Stock bajo</span>}</div>
    <strong className="entity-price">{money(product.precio)}</strong>
    <div className="row-actions"><Link className="text-link" to={`/productos/${product.id}`}>Detalle</Link>{canEdit && <Link className="text-link" to={`/productos/${product.id}/editar`}>Editar</Link>}{canDelete && <button type="button" className="text-link danger-link" onClick={() => onDelete?.(product)}>Eliminar</button>}</div>
  </article>;
}
