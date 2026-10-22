import { useEffect, useState } from 'react';
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
  const { data: product, loading, error: loadError, refetch } = useFetch(isEditing ? `/productos/${id}` : null);
  const { data: ingredients, loading: ingredientsLoading, error: ingredientsError, refetch: refetchIngredients } = useFetch('/insumos?orden=nombre');
  const { data: recipe, loading: recipeLoading, error: recipeError, refetch: refetchRecipe } = useFetch(isEditing ? `/productos/${id}/receta` : null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [savedId, setSavedId] = useState(null);
  const [recipeItems, setRecipeItems] = useState([]);
  const [recipeInitialized, setRecipeInitialized] = useState(false);

  useEffect(() => {
    if (recipe && !recipeInitialized) {
      setRecipeItems((recipe.items || []).map((item) => ({ insumo_id: String(item.insumo_id), cantidad: String(item.cantidad) })));
      setRecipeInitialized(true);
    }
  }, [recipe, recipeInitialized]);

  const changeRecipe = (index, field, value) => setRecipeItems((current) => current.map((item, i) => i === index ? { ...item, [field]: value } : item));
  const addIngredient = () => setRecipeItems((current) => [...current, { insumo_id: '', cantidad: '1' }]);
  const removeIngredient = (index) => setRecipeItems((current) => current.filter((_, i) => i !== index));

  const save = async (payload) => {
    setSaving(true);
    setError(null);
    try {
      const existingId = id || savedId;
      const result = existingId ? await api.put(`/productos/${existingId}`, payload) : await api.post('/productos', payload);
      const targetId = result?.id || existingId;
      if (!targetId) throw new Error('El backend guardó el producto, pero no devolvió su identificador. Comprueba la ficha antes de reintentar.');
      setSavedId(targetId);
      const items = recipeItems.map((item) => ({ insumo_id: Number(item.insumo_id), cantidad: Number(item.cantidad) }));
      if (items.some((item) => !Number.isInteger(item.insumo_id) || item.insumo_id < 1 || !Number.isFinite(item.cantidad) || item.cantidad <= 0)) {
        throw new Error('El producto se guardó, pero la receta tiene un ingrediente o cantidad inválidos. Corrige la receta y vuelve a guardar.');
      }
      if (new Set(items.map((item) => item.insumo_id)).size !== items.length) {
        throw new Error('El producto se guardó, pero la receta repite un insumo. Cada insumo debe aparecer una sola vez.');
      }
      await api.put(`/productos/${targetId}/receta`, { items });
      navigate(`/productos/${targetId}`);
    } catch (requestError) {
      setError(requestError);
    } finally {
      setSaving(false);
    }
  };

  if (loading || (isEditing && recipeLoading) || ingredientsLoading) return <LoadingState message="Preparando producto, insumos y receta…" />;
  if (loadError) return <div className="page-stack"><ErrorMessage error={loadError} onRetry={refetch} /><Link to="/productos" className="text-link">Volver al catálogo</Link></div>;
  if (recipeError && isEditing) return <div className="page-stack"><ErrorMessage error={recipeError} onRetry={refetchRecipe} /><Link to="/productos" className="text-link">Volver al catálogo</Link></div>;

  return <section className="page-stack narrow-page">
    <Link className="back-link" to="/productos">← Volver al catálogo</Link>
    <div className="page-heading"><span className="eyebrow">CATÁLOGO DE CAFETERÍA</span><h1>{isEditing ? 'Editar producto' : 'Nuevo producto'}</h1><p>{isEditing ? 'Actualiza el producto y define los ingredientes que se consumen por unidad.' : 'Registra una bebida o alimento y define su receta por unidad.'}</p></div>
    <ProductForm initial={product} onSubmit={save} saving={saving} error={error} submitLabel={isEditing || savedId ? 'Guardar producto y receta' : 'Crear producto y receta'} />
    <section className="panel-card recipe-editor" aria-labelledby="recipe-heading">
      <div className="section-heading"><div><span className="eyebrow">CONTROL DE INGREDIENTES</span><h2 id="recipe-heading">Receta por unidad</h2></div><button type="button" className="button button-secondary button-small" onClick={addIngredient} disabled={ingredientsError || saving}>＋ Añadir insumo</button></div>
      <p className="muted-text">La cantidad indica cuánto se consume por cada unidad vendida, por ejemplo 18 g de café y 120 ml de leche. Los insumos se descuentan al confirmar la venta.</p>
      {ingredientsError && <ErrorMessage error={ingredientsError} onRetry={refetchIngredients} />}
      {!ingredientsError && recipeItems.length === 0 && <div className="empty-inline"><strong>Producto sin receta</strong><p>Se podrá vender, pero no se descontarán ingredientes hasta que agregues insumos.</p></div>}
      {recipeItems.map((item, index) => <div className="recipe-line" key={`${index}-${item.insumo_id}`}>
        <label className="field"><span>Insumo</span><select value={item.insumo_id} required onChange={(event) => changeRecipe(index, 'insumo_id', event.target.value)}><option value="">Selecciona un insumo</option>{(ingredients || []).filter((ingredient) => ingredient.activo || String(ingredient.id) === item.insumo_id).map((ingredient) => <option key={ingredient.id} value={String(ingredient.id)}>{ingredient.nombre} ({ingredient.unidad}){!ingredient.activo ? ' · inactivo' : ''}</option>)}</select></label>
        <label className="field"><span>Cantidad por unidad</span><input type="number" min="0.001" max="999999999.999" step="0.001" required value={item.cantidad} onChange={(event) => changeRecipe(index, 'cantidad', event.target.value)} /></label>
        <button type="button" className="button button-ghost button-small" onClick={() => removeIngredient(index)} aria-label={`Quitar ingrediente ${index + 1}`}>Quitar</button>
      </div>)}
      <p className="form-hint">La receta se guarda junto con el botón «{isEditing || savedId ? 'Guardar producto y receta' : 'Crear producto y receta'}». Puedes dejarla vacía, pero ese producto no consumirá insumos automáticamente.</p>
    </section>
  </section>;
}
