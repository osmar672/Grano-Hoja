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
    <div className="page-hero"><div><span className="eyebrow">{inventoryOnly ? 'CATÁLOGO' : 'CATÁLOGO DE CAFETERÍA'}</span><h1>{inventoryOnly ? 'Productos' : 'Productos'}</h1><p>{inventoryOnly ? 'Consulta el catálogo de productos de la cafetería.' : 'Administra bebidas, repostería y alimentos con sus recetas.'}</p></div>{canManage && <Link className="button button-primary" to="/productos/nuevo">＋ Nuevo producto</Link>}</div>
    <ErrorMessage error={errorAction} />
    <div className="filter-bar"><label className="search-field"><span aria-hidden="true">⌕</span><input aria-label="Buscar productos" placeholder="Buscar bebidas o alimentos…" value={search} onChange={(e) => setSearch(e.target.value)} /></label><label className="compact-field"><span>Categoría</span><select value={category} onChange={(e) => setCategory(e.target.value)}><option value="">Todas</option><option value="bebidas_calientes">Bebidas calientes</option><option value="bebidas_frias">Bebidas frías</option><option value="reposteria">Repostería</option><option value="comida">Comida</option><optgroup label="Categorías históricas"><option value="plantas">Plantas (histórica)</option><option value="muebles">Muebles (histórica)</option><option value="decoracion">Decoración (histórica)</option></optgroup></select></label><label className="compact-field"><span>Ordenar por</span><select value={sort} onChange={(e) => setSort(e.target.value)}><option value="nombre">Nombre</option><option value="precio">Precio</option><option value="categoria">Categoría</option><option value="stock">Stock legado del producto</option></select></label><button type="button" className="button button-secondary" onClick={() => setDirection((v) => v === 'asc' ? 'desc' : 'asc')}>{direction === 'asc' ? '↑ Ascendente' : '↓ Descendente'}</button></div>
    <div className="list-meta"><span>{loading ? 'Actualizando…' : `${data?.length || 0} artículos`}</span><span>{'El consumo de ingredientes se controla en Insumos mediante las recetas'}</span></div>
    {error && <ErrorMessage error={error} onRetry={refetch} />}
    {loading ? <LoadingState message="Cargando colección…" /> : data && <EntityList items={data} getKey={(item) => item.id} emptyTitle={'Todavía no hay productos'} emptyText={inventoryOnly ? 'Registra bebidas y alimentos para empezar a vender.' : 'Prueba otra búsqueda o añade un producto al catálogo.'} renderItem={(item) => <ProductItem product={item} onDelete={canDelete ? remove : undefined} canEdit={canManage} canDelete={canDelete} />} />}
  </section>;
}
