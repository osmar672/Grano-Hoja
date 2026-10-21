export default function EmptyState({ title = 'No hay resultados', children = 'Prueba a cambiar los filtros o registra el primer elemento.' }) {
  return <div className="empty-state"><span className="empty-icon" aria-hidden="true">◇</span><h3>{title}</h3><p>{children}</p></div>;
}
