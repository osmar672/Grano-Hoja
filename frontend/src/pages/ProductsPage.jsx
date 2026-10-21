import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useFetch } from '../hooks/useFetch.js';
import { api } from '../services/api.js';
import EntityList from '../components/EntityList.jsx';
import ProductItem from '../components/ProductItem.jsx';
import LoadingState from '../components/LoadingState.jsx';
import ErrorMessage from '../components/ErrorMessage.jsx';
import { useAuth } from '../auth/AuthProvider.jsx';
import { can } from '../auth/permissions.js';

export default function ProductsPage({ inventoryOnly = false }) {
  const { user } = useAuth(); const canManage = can(user, 'manageCatalog'); const canDelete = can(user, 'deleteCatalog');
  const [search,setSearch] = useState(''); const [debouncedSearch,setDebouncedSearch] = useState(''); const [category,setCategory] = useState(''); const [sort,setSort] = useState('nombre'); const [direction,setDirection] = useState('asc'); const [errorAction,setErrorAction] = useState(null);
  useEffect(() => { const timer = setTimeout(() => setDebouncedSearch(search.trim()), 280); return () => clearTimeout(timer); }, [search]);
  const params = useMemo(() => {
    const q = new URLSearchParams();
    if (debouncedSearch) q.set('q', debouncedSearch);
    if (category) q.set('categoria', category);
    q.set('orden', sort);
    q.set('direccion', direction);
    // La vista Inventario muestra todos los artículos para revisar cada existencia.
    return `/productos?${q}`;
  }, [debouncedSearch, category, sort, direction]);
  const { data,loading,error,refetch } = useFetch(params);
  const remove = async (product) => { if (!window.confirm(`¿Eliminar «${product.nombre}»? Las ventas históricas no se borrarán.`)) return; try { setErrorAction(null); await api.delete(`/productos/${product.id}`); refetch(); } catch (e) { setErrorAction(e); } };
  return <section className="page-stack">
    <div className="page-hero"><div><span className="eyebrow">{inventoryOnly ? 'CONTROL DE EXISTENCIAS' : 'COLECCIÓN DE CASA Y JARDÍN'}</span><h1>{inventoryOnly ? 'Inventario' : 'Productos'}</h1><p>{inventoryOnly ? 'Revisa las existencias de todas las plantas, muebles y piezas decorativas.' : 'Plantas con vida, muebles con carácter y detalles que hacen hogar.'}</p></div>{canManage && <Link className="button button-primary" to="/productos/nuevo">＋ Nuevo producto</Link>}</div>
    <ErrorMessage error={errorAction} />
    <div className="filter-bar"><label className="search-field"><span aria-hidden="true">⌕</span><input aria-label="Buscar productos" placeholder="Buscar plantas, muebles o decoración…" value={search} onChange={(e) => setSearch(e.target.value)} /></label><label className="compact-field"><span>Categoría</span><select value={category} onChange={(e) => setCategory(e.target.value)}><option value="">Todas</option><option value="plantas">Plantas</option><option value="muebles">Muebles</option><option value="decoracion">Decoración</option></select></label><label className="compact-field"><span>Ordenar por</span><select value={sort} onChange={(e) => setSort(e.target.value)}><option value="nombre">Nombre</option><option value="precio">Precio</option><option value="categoria">Categoría</option><option value="stock">Existencias</option></select></label><button type="button" className="button button-secondary" onClick={() => setDirection((v) => v === 'asc' ? 'desc' : 'asc')}>{direction === 'asc' ? '↑ Ascendente' : '↓ Descendente'}</button></div>
    <div className="list-meta"><span>{loading ? 'Actualizando…' : `${data?.length || 0} artículos`}</span><span>{inventoryOnly ? 'Todas las existencias · alerta en artículos bajo mínimo' : 'Catálogo con stock real'}</span></div>
    {error && <ErrorMessage error={error} onRetry={refetch} />}
    {loading ? <LoadingState message="Cargando colección…" /> : data && <EntityList items={data} getKey={(item) => item.id} emptyTitle={inventoryOnly ? 'Todavía no hay artículos' : 'No encontramos productos'} emptyText={inventoryOnly ? 'Crea productos para empezar a controlar las existencias.' : 'Prueba otra búsqueda o añade un producto al catálogo.'} renderItem={(item) => <ProductItem product={item} onDelete={canDelete ? remove : undefined} canEdit={canManage} canDelete={canDelete} />} />}
  </section>;
}
