import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useFetch } from '../hooks/useFetch.js';
import { api } from '../services/api.js';
import EntityList from '../components/EntityList.jsx';
import ProductItem from '../components/ProductItem.jsx';
import LoadingState from '../components/LoadingState.jsx';
import ErrorMessage from '../components/ErrorMessage.jsx';

export default function ProductsPage() {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [category, setCategory] = useState('');
  const [sort, setSort] = useState('nombre');
  const [direction, setDirection] = useState('asc');
  const [errorAction, setErrorAction] = useState(null);
  useEffect(() => { const timer = setTimeout(() => setDebouncedSearch(search.trim()), 300); return () => clearTimeout(timer); }, [search]);
  const path = useMemo(() => `/productos?${new URLSearchParams({ q: debouncedSearch, categoria: category, orden: sort, direccion: direction })}`, [debouncedSearch, category, sort, direction]);
  const { data, loading, error, refetch } = useFetch(path);
  const remove = async (product) => {
    if (!window.confirm(`¿Eliminar «${product.nombre}»? Esta acción no se puede deshacer.`)) return;
    try { setErrorAction(null); await api.delete(`/productos/${product.id}`); refetch(); }
    catch (requestError) { setErrorAction(requestError); }
  };
  return <section className="page-stack">
    <div className="page-hero"><div><span className="eyebrow">MENÚ DE LA CAFETERÍA</span><h1>Productos</h1><p>Gestiona precios, recetas y disponibilidad real por insumos.</p></div><Link className="button button-primary" to="/productos/nuevo">＋ Nuevo producto</Link></div>
    <ErrorMessage error={errorAction} />
    <div className="filter-bar"><label className="search-field"><span aria-hidden="true">⌕</span><input aria-label="Buscar productos" placeholder="Buscar por nombre…" value={search} onChange={(event) => setSearch(event.target.value)} /></label>
      <label className="compact-field"><span>Categoría</span><select value={category} onChange={(e) => setCategory(e.target.value)}><option value="">Todas</option><option>Bebidas calientes</option><option>Bebidas frías</option><option>Panadería</option><option>Repostería</option></select></label>
      <label className="compact-field"><span>Ordenar por</span><select value={sort} onChange={(e) => setSort(e.target.value)}><option value="nombre">Nombre</option><option value="precio">Precio</option><option value="categoria">Categoría</option></select></label>
      <button className="button button-secondary" onClick={() => setDirection((value) => value === 'asc' ? 'desc' : 'asc')} aria-label="Cambiar dirección de ordenamiento">{direction === 'asc' ? '↑ Ascendente' : '↓ Descendente'}</button>
    </div>
    <div className="list-meta"><span>{loading ? 'Actualizando…' : `${data?.length || 0} productos`}</span><span>Disponibilidad calculada con stock de recetas</span></div>
    {error && <ErrorMessage error={error} onRetry={refetch} />}
    {loading ? <LoadingState /> : data && <EntityList items={data} getKey={(item) => item.id} emptyTitle="No encontramos productos" emptyText="Prueba con otra búsqueda o registra un producto nuevo." renderItem={(item) => <ProductItem product={item} onDelete={remove} />} />}
  </section>;
}
