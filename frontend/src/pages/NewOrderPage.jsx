import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../services/api.js';
import { useFetch } from '../hooks/useFetch.js';
import LoadingState from '../components/LoadingState.jsx';
import ErrorMessage from '../components/ErrorMessage.jsx';
import EmptyState from '../components/EmptyState.jsx';
const money = (value) => new Intl.NumberFormat('es-CR', { style: 'currency', currency: 'CRC' }).format(Number(value || 0));
export default function NewOrderPage() {
  const { data: products, loading, error: productsError, refetch } = useFetch('/productos?activo=true&orden=nombre');
  const [quantities, setQuantities] = useState({}); const [payment, setPayment] = useState('efectivo'); const [sending, setSending] = useState(false); const [error, setError] = useState(null); const [pendingId, setPendingId] = useState(null); const navigate = useNavigate();
  const selected = useMemo(() => (products || []).filter((product) => Number(quantities[product.id] || 0) > 0).map((product) => ({ ...product, cantidad: Number(quantities[product.id]) })), [products, quantities]);
  const subtotalCents = selected.reduce((sum, item) => sum + Math.round(Number(item.precio) * 100) * item.cantidad, 0);
  const subtotal = subtotalCents / 100; const tax = Math.round(subtotalCents * 0.13) / 100; const total = subtotal + tax;
  const setQty = (id, value) => setQuantities((current) => ({ ...current, [id]: Math.max(0, Math.min(999, Number(value) || 0)) }));
  const submit = async (event) => {
    event.preventDefault(); if (!selected.length) { setError({ status: 400, message: 'Agrega al menos un producto al pedido.' }); return; }
    setSending(true); setError(null); setPendingId(null);
    try {
      const created = await api.post('/pedidos', { metodo_pago: payment, items: selected.map((item) => ({ producto_id: item.id, cantidad: item.cantidad })) });
      try {
        await api.post(`/pedidos/${created.id}/confirmar`, {});
        navigate('/pedidos');
      } catch (confirmationError) {
        setPendingId(created.id);
        setError({ ...confirmationError, message: `El pedido #${created.id} quedó pendiente porque no se pudo confirmar. ${confirmationError.message}` });
      }
    } catch (requestError) { setError(requestError); }
    finally { setSending(false); }
  };
  if (loading) return <LoadingState message="Cargando menú y disponibilidad…" />;
  return <section className="page-stack"><div className="page-hero"><div><span className="eyebrow">PUNTO DE VENTA</span><h1>Nuevo pedido</h1><p>Elige productos y confirma para descontar el inventario.</p></div><Link className="back-link" to="/pedidos">Ver historial →</Link></div>
    <ErrorMessage error={productsError} onRetry={refetch} />
    <form onSubmit={submit} className="pos-layout">
      <section className="panel-card"><div className="section-heading"><div><span className="eyebrow">MENÚ</span><h2>Selecciona productos</h2></div><span className="muted-text">Precio por unidad</span></div>
        {products?.length ? <div className="pos-product-list">{products.map((product) => <div className="pos-product" key={product.id}><div className="pos-product-initial">{product.nombre.slice(0,1)}</div><div className="entity-main"><strong>{product.nombre}</strong><small>{money(product.precio)} · {product.disponible ? `${product.porciones_disponibles} porciones posibles` : 'Sin insumos suficientes'}</small></div><label className="quantity-control"><span className="sr-only">Cantidad de {product.nombre}</span><button type="button" onClick={() => setQty(product.id, Number(quantities[product.id] || 0) - 1)} aria-label={`Quitar uno de ${product.nombre}`}>−</button><input aria-label={`Cantidad de ${product.nombre}`} type="number" min="0" max="999" step="1" value={quantities[product.id] || ''} onChange={(e) => setQty(product.id, e.target.value)} /><button type="button" onClick={() => setQty(product.id, Number(quantities[product.id] || 0) + 1)} aria-label={`Añadir uno de ${product.nombre}`}>＋</button></label></div>)}</div> : <EmptyState title="No hay productos activos" />}
      </section>
      <aside className="panel-card order-receipt"><span className="eyebrow">RESUMEN</span><h2>Tu pedido</h2><div className="receipt-items">{selected.length ? selected.map((item) => <div className="receipt-item" key={item.id}><span>{item.cantidad} × {item.nombre}</span><strong>{money(Number(item.precio) * item.cantidad)}</strong></div>) : <p className="muted-text">Todavía no has agregado productos.</p>}</div>
        <label className="field">Método de pago<select value={payment} onChange={(e) => setPayment(e.target.value)}><option value="efectivo">Efectivo</option><option value="tarjeta">Tarjeta</option><option value="sinpe_movil">SINPE Móvil</option></select></label>
        <div className="receipt-totals"><div><span>Subtotal</span><strong>{money(subtotal)}</strong></div><div><span>Impuesto (13%)</span><strong>{money(tax)}</strong></div><div className="receipt-grand-total"><span>Total</span><strong>{money(total)}</strong></div></div>
        <button className="button button-primary button-full" type="submit" disabled={sending || !selected.length}>{sending ? 'Confirmando…' : 'Crear y confirmar pedido'}</button><small className="receipt-footnote">El servidor vuelve a validar stock y calcula el monto definitivo.</small>
        {error && <ErrorMessage error={error} />}{pendingId && <Link className="text-link" to="/pedidos">Ir al historial para revisar el pedido #{pendingId} →</Link>}
      </aside>
    </form>
  </section>;
}
