import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../services/api.js';
import { useFetch } from '../hooks/useFetch.js';
import ProductForm from '../components/ProductForm.jsx';
import LoadingState from '../components/LoadingState.jsx';
import ErrorMessage from '../components/ErrorMessage.jsx';
export default function ProductFormPage() {
  const { id } = useParams();
  const isEditing = Boolean(id);
  const navigate = useNavigate();
  const { data: product, loading: productLoading, error: productError, refetch } = useFetch(isEditing ? `/productos/${id}` : null);
  const { data: insumos, loading: suppliesLoading, error: suppliesError } = useFetch('/insumos?orden=nombre');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const save = async (payload) => {
    setSaving(true); setError(null);
    try {
      const result = isEditing ? await api.put(`/productos/${id}`, payload) : await api.post('/productos', payload);
      navigate(`/productos/${result.id}`);
    } catch (requestError) { setError(requestError); }
    finally { setSaving(false); }
  };
  if (productLoading || suppliesLoading) return <LoadingState message="Preparando formulario…" />;
  if (productError || suppliesError) return <div className="page-stack"><ErrorMessage error={productError || suppliesError} onRetry={refetch} /><Link to="/productos" className="text-link">Volver al menú</Link></div>;
  return <section className="page-stack narrow-page"><Link className="back-link" to="/productos">← Volver a productos</Link><div className="page-heading"><span className="eyebrow">MENÚ Y RECETAS</span><h1>{isEditing ? 'Editar producto' : 'Nuevo producto'}</h1><p>{isEditing ? 'Actualiza los datos y la receta por porción.' : 'Registra un producto con al menos un ingrediente de receta.'}</p></div><ProductForm initial={product} insumos={insumos || []} onSubmit={save} saving={saving} error={error} submitLabel={isEditing ? 'Guardar cambios' : 'Crear producto'} /></section>;
}
