import { useEffect, useState } from 'react';
import ErrorMessage from './ErrorMessage.jsx';
export default function InsumoForm({ initial, onSubmit, saving, error, submitLabel }) {
  const [form, setForm] = useState({ nombre: '', unidad: 'g', stock: '0', stock_minimo: '0' });
  useEffect(() => { if (initial) setForm({ nombre: initial.nombre || '', unidad: initial.unidad || 'g', stock: String(initial.stock ?? 0), stock_minimo: String(initial.stock_minimo ?? 0) }); }, [initial]);
  const submit = (event) => { event.preventDefault(); onSubmit({ nombre: form.nombre.trim(), unidad: form.unidad.trim(), stock: Number(form.stock), stock_minimo: Number(form.stock_minimo) }); };
  return <form className="form-card" onSubmit={submit}>
    <ErrorMessage error={error} />
    <div className="form-grid">
      <label className="field field-wide">Nombre<input required maxLength="120" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} /></label>
      <label className="field">Unidad<input required maxLength="20" placeholder="g, ml, unidad" value={form.unidad} onChange={(e) => setForm({ ...form, unidad: e.target.value })} /></label>
      <label className="field">Stock actual<input required type="number" min="0" step="0.001" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} /></label>
      <label className="field">Stock mínimo<input required type="number" min="0" step="0.001" value={form.stock_minimo} onChange={(e) => setForm({ ...form, stock_minimo: e.target.value })} /></label>
    </div>
    <div className="form-actions"><button className="button button-primary" disabled={saving} type="submit">{saving ? 'Guardando…' : submitLabel}</button><span className="form-hint">El stock nunca puede ser negativo.</span></div>
  </form>;
}
