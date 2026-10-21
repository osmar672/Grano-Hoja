import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useFetch } from '../hooks/useFetch.js';
import { api } from '../services/api.js';
import EntityList from '../components/EntityList.jsx';
import InsumoItem from '../components/InsumoItem.jsx';
import LoadingState from '../components/LoadingState.jsx';
import ErrorMessage from '../components/ErrorMessage.jsx';
import { useAuth } from '../auth/AuthProvider.jsx';
import { can } from '../auth/permissions.js';
export default function InsumosPage() {
  const { user } = useAuth();
  const canManage = can(user, 'manageCatalog');
  const canDelete = can(user, 'deleteCatalog');
  const [search, setSearch] = useState('');
  const [lowOnly, setLowOnly] = useState(false);
  const [sort, setSort] = useState('nombre');
  const [errorAction, setErrorAction] = useState(null);
  const path = useMemo(() => `/insumos?${new URLSearchParams({ q: search.trim(), bajo_minimo: String(lowOnly), orden: sort })}`, [search, lowOnly, sort]);
  const { data, loading, error, refetch } = useFetch(path);
  const remove = async (item) => {
    if (!window.confirm(`¿Eliminar el insumo «${item.nombre}»? Si está en una receta, la API lo rechazará.`)) return;
    try { setErrorAction(null); await api.delete(`/insumos/${item.id}`); refetch(); }
    catch (requestError) { setErrorAction(requestError); }
  };
  return <section className="page-stack">
    <div className="page-hero"><div><span className="eyebrow">CONTROL DE EXISTENCIAS</span><h1>Insumos</h1><p>Cuida cada ingrediente para que ninguna receta se quede a medias.</p></div>{canManage && <Link className="button button-primary" to="/insumos/nuevo">＋ Nuevo insumo</Link>}</div>
    {errorAction && <ErrorMessage error={errorAction} />}
    <div className="filter-bar"><label className="search-field"><span aria-hidden="true">⌕</span><input aria-label="Buscar insumos" placeholder="Buscar insumo…" value={search} onChange={(e) => setSearch(e.target.value)} /></label><label className="checkbox-filter"><input type="checkbox" checked={lowOnly} onChange={(e) => setLowOnly(e.target.checked)} /> Solo bajo mínimo</label><label className="compact-field"><span>Ordenar por</span><select value={sort} onChange={(e) => setSort(e.target.value)}><option value="nombre">Nombre</option><option value="stock">Stock</option><option value="stock_minimo">Stock mínimo</option></select></label></div>
    <div className="list-meta"><span>{loading ? 'Actualizando…' : `${data?.length || 0} insumos`}</span><span>Alerta cuando el stock está por debajo del mínimo</span></div>
    {error && <ErrorMessage error={error} onRetry={refetch} />}
    {loading ? <LoadingState /> : data && <EntityList items={data} getKey={(item) => item.id} emptyTitle="No hay insumos para mostrar" emptyText="Cambia los filtros o registra un ingrediente." renderItem={(item) => <InsumoItem item={item} onDelete={canDelete ? remove : undefined} canEdit={canManage} canDelete={canDelete} />} />}
  </section>;
}
