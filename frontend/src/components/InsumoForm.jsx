import { useEffect, useState } from 'react';
import ErrorMessage from './ErrorMessage.jsx';
export default function InsumoForm({ initial, onSubmit, saving, error, submitLabel }) {
  const [form, setForm] = useState({ nombre: '', unidad: 'g', stock: '0', stock_minimo: '0' });
  const [clientError, setClientError] = useState('');
  useEffect(() => { if (initial) setForm({ nombre: initial.nombre || '', unidad: initial.unidad || 'g', stock: String(initial.stock ?? 0), stock_minimo: String(initial.stock_minimo ?? 0) }); }, [initial]);
  const submit = (event) => {
    event.preventDefault();
    const nombre = form.nombre.trim(); const unidad = form.unidad.trim();
    const stock = Number(form.stock); const stockMinimo = Number(form.stock_minimo);
    if (!nombre || nombre.length > 120 || /[<>]/.test(nombre)) return setClientError('Escribe un nombre válido de hasta 120 caracteres.');
    if (!unidad || unidad.length > 20 || /[<>]/.test(unidad)) return setClientError('La unidad es obligatoria y debe tener máximo 20 caracteres.');
    if (!Number.isFinite(stock) || stock < 0 || !Number.isFinite(stockMinimo) || stockMinimo < 0) return setClientError('El stock actual y el mínimo deben ser números mayores o iguales a cero.');
    setClientError('');
    onSubmit({ nombre, unidad, stock, stock_minimo: stockMinimo });
  };
  return <form className="form-card" onSubmit={submit}>
    <ErrorMessage error={clientError ? { message: clientError } : error} />
    <div className="form-grid">
      <label className="field field-wide">Nombre<input required maxLength="120" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} /></label>
      <label className="field">Unidad<input required maxLength="20" placeholder="g, ml, unidad" value={form.unidad} onChange={(e) => setForm({ ...form, unidad: e.target.value })} /></label>
      <label className="field">Stock actual<input required type="number" min="0" step="0.001" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} /></label>
      <label className="field">Stock mínimo<input required type="number" min="0" step="0.001" value={form.stock_minimo} onChange={(e) => setForm({ ...form, stock_minimo: e.target.value })} /></label>
    </div>
    <div className="form-actions"><button className="button button-primary" disabled={saving} type="submit">{saving ? 'Guardando…' : submitLabel}</button><span className="form-hint">El stock nunca puede ser negativo.</span></div>
  </form>;
}
