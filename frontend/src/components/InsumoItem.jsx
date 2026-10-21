import { Link } from 'react-router-dom';
export default function InsumoItem({ item, onDelete, canEdit = false, canDelete = false }) {
  const low = Number(item.stock) < Number(item.stock_minimo);
  return <article className="entity-row">
    <div className={`stock-dot ${low ? 'stock-dot-low' : ''}`} aria-hidden="true" />
    <div className="entity-main"><div className="entity-title-line"><strong>{item.nombre}</strong>{low && <span className="status-pill status-warning">Bajo mínimo</span>}</div><small>Mínimo: {item.stock_minimo} {item.unidad}</small></div>
    <div className="stock-amount"><strong>{item.stock}</strong><small>{item.unidad}</small></div>
    <div className="row-actions">{canEdit && <Link className="text-link" to={`/insumos/${item.id}/editar`}>Editar</Link>}{canDelete && <button className="text-link danger-link" onClick={() => onDelete?.(item)}>Eliminar</button>}</div>
  </article>;
}
