import { useEffect, useState } from 'react';
import ErrorMessage from './ErrorMessage.jsx';
const initialForm = { nombre: '', descripcion: '', precio: '', categoria: 'plantas', stock: '0', stock_minimo: '0', activo: true };
export default function ProductForm({ initial, onSubmit, saving, error, submitLabel }) {
  const [form,setForm] = useState(initialForm); const [clientError,setClientError] = useState('');
  useEffect(() => { if (initial) setForm({ nombre:initial.nombre || '', descripcion:initial.descripcion || '', precio:String(initial.precio ?? ''), categoria:initial.categoria || 'plantas', stock:String(initial.stock ?? 0), stock_minimo:String(initial.stock_minimo ?? 0), activo:initial.activo ?? true }); },[initial]);
  const set = (field,value) => setForm((current) => ({ ...current,[field]:value }));
  const submit = (event) => {
    event.preventDefault(); const nombre=form.nombre.trim(), descripcion=form.descripcion.trim(), precio=Number(form.precio), stock=Number(form.stock), stock_minimo=Number(form.stock_minimo);
    if (!nombre || nombre.length>140 || /[<>]/.test(nombre)) return setClientError('Escribe un nombre válido de hasta 140 caracteres.');
    if (/[<>]/.test(descripcion) || descripcion.length>1200) return setClientError('La descripción no puede contener marcado HTML ni superar 1200 caracteres.');
    if (!['plantas','muebles','decoracion'].includes(form.categoria)) return setClientError('Selecciona una categoría permitida.');
    if (!Number.isFinite(precio) || precio<=0) return setClientError('El precio debe ser mayor que cero.');
    if (!Number.isInteger(stock) || stock<0 || !Number.isInteger(stock_minimo) || stock_minimo<0) return setClientError('El stock y el mínimo deben ser números enteros no negativos.');
    setClientError(''); onSubmit({ nombre, descripcion, precio, categoria:form.categoria, stock, stock_minimo, activo:form.activo });
  };
  return <form className="form-card" onSubmit={submit}><ErrorMessage error={clientError ? {message:clientError} : error}/><div className="form-grid">
    <label className="field field-wide">Nombre del producto<input required maxLength="140" value={form.nombre} onChange={(e)=>set('nombre',e.target.value)} placeholder="Ej. Monstera deliciosa"/></label>
    <label className="field field-wide">Descripción<textarea rows="3" maxLength="1200" value={form.descripcion} onChange={(e)=>set('descripcion',e.target.value)} placeholder="Materiales, dimensiones, cuidados o detalles…"/></label>
    <label className="field">Precio (₡)<input required type="number" min="0.01" step="0.01" value={form.precio} onChange={(e)=>set('precio',e.target.value)}/></label>
    <label className="field">Categoría<select value={form.categoria} onChange={(e)=>set('categoria',e.target.value)}><option value="plantas">Plantas</option><option value="muebles">Muebles</option><option value="decoracion">Decoración</option></select></label>
    <label className="field">Existencias actuales<input required type="number" min="0" max="1000000" step="1" value={form.stock} onChange={(e)=>set('stock',e.target.value)}/></label>
    <label className="field">Mínimo de reposición<input required type="number" min="0" max="1000000" step="1" value={form.stock_minimo} onChange={(e)=>set('stock_minimo',e.target.value)}/></label>
    <label className="field field-inline"><input type="checkbox" checked={form.activo} onChange={(e)=>set('activo',e.target.checked)}/> Producto activo para la venta</label>
  </div><div className="form-actions"><button disabled={saving} className="button button-primary" type="submit">{saving?'Guardando…':submitLabel}</button><span className="form-hint">El servidor vuelve a validar precio, categoría y existencias.</span></div></form>;
}
