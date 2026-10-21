import { useEffect, useState } from 'react';
import ErrorMessage from './ErrorMessage.jsx';

const emptyRecipe = () => ({ insumo_id: '', cantidad: '1' });
export default function ProductForm({ initial, insumos = [], onSubmit, saving, error, submitLabel }) {
  const [form, setForm] = useState({ nombre: '', precio: '', categoria: 'Bebidas calientes', activo: true, receta: [emptyRecipe()] });
  useEffect(() => {
    if (!initial) return;
    setForm({ nombre: initial.nombre || '', precio: initial.precio || '', categoria: initial.categoria || 'Bebidas calientes', activo: initial.activo ?? true,
      receta: initial.receta?.length ? initial.receta.map((row) => ({ insumo_id: String(row.insumo_id), cantidad: String(row.cantidad) })) : [emptyRecipe()] });
  }, [initial]);
  const updateRecipe = (index, field, value) => setForm((current) => ({ ...current, receta: current.receta.map((row, i) => i === index ? { ...row, [field]: value } : row) }));
  const addRecipe = () => setForm((current) => ({ ...current, receta: [...current.receta, emptyRecipe()] }));
  const removeRecipe = (index) => setForm((current) => ({ ...current, receta: current.receta.filter((_, i) => i !== index) }));
  const handleSubmit = (event) => {
    event.preventDefault();
    onSubmit({ ...form, precio: Number(form.precio), receta: form.receta.map((row) => ({ insumo_id: Number(row.insumo_id), cantidad: Number(row.cantidad) })) });
  };
  return <form className="form-card" onSubmit={handleSubmit}>
    <ErrorMessage error={error} />
    <div className="form-grid">
      <label className="field field-wide">Nombre<input required maxLength="120" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} /></label>
      <label className="field">Precio (₡)<input required type="number" min="0.01" step="0.01" value={form.precio} onChange={(e) => setForm({ ...form, precio: e.target.value })} /></label>
      <label className="field">Categoría<select value={form.categoria} onChange={(e) => setForm({ ...form, categoria: e.target.value })}><option>Bebidas calientes</option><option>Bebidas frías</option><option>Panadería</option><option>Repostería</option></select></label>
      <label className="field field-inline"><input type="checkbox" checked={form.activo} onChange={(e) => setForm({ ...form, activo: e.target.checked })} /> Producto activo</label>
    </div>
    <div className="section-heading recipe-heading"><div><h3>Receta por porción</h3><p>Define cuánto insumo se consume al preparar una unidad.</p></div><button className="button button-secondary button-small" type="button" onClick={addRecipe}>＋ Añadir insumo</button></div>
    {form.receta.map((row, index) => <div className="recipe-row" key={index}>
      <label className="field">Insumo<select required value={row.insumo_id} onChange={(e) => updateRecipe(index, 'insumo_id', e.target.value)}><option value="">Selecciona…</option>{insumos.map((item) => <option key={item.id} value={item.id}>{item.nombre} ({item.unidad})</option>)}</select></label>
      <label className="field">Cantidad<input required type="number" min="0.001" step="0.001" value={row.cantidad} onChange={(e) => updateRecipe(index, 'cantidad', e.target.value)} /></label>
      <button type="button" disabled={form.receta.length === 1} className="icon-button" aria-label="Quitar insumo de la receta" onClick={() => removeRecipe(index)}>×</button>
    </div>)}
    <div className="form-actions"><button disabled={saving || insumos.length === 0} className="button button-primary" type="submit">{saving ? 'Guardando…' : submitLabel}</button><span className="form-hint">La API vuelve a validar todos los datos.</span></div>
  </form>;
}
