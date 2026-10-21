import { pool } from '../db.js';
import { AppError } from '../utils/AppError.js';

const round2 = (value) => Math.round((value + Number.EPSILON) * 100) / 100;
function validateItems(items) {
  if (!Array.isArray(items) || !items.length) throw new AppError(400, 'La venta debe incluir al menos un producto');
  const grouped = new Map();
  for (const item of items) {
    const id = Number(item.producto_id); const cantidad = Number(item.cantidad);
    if (!Number.isInteger(id) || id <= 0 || !Number.isInteger(cantidad) || cantidad <= 0 || cantidad > 999) throw new AppError(400, 'Cada línea requiere un producto válido y una cantidad entera entre 1 y 999');
    grouped.set(id, (grouped.get(id) || 0) + cantidad);
  }
  return [...grouped].map(([producto_id, cantidad]) => ({ producto_id, cantidad }));
}

const orderSelect = `SELECT pe.*, COALESCE((SELECT jsonb_agg(jsonb_build_object('producto_id', pi.producto_id, 'nombre', pr.nombre,
  'categoria', pr.categoria, 'cantidad', pi.cantidad, 'precio_unitario', pi.precio_unitario,
  'total_linea', pi.cantidad * pi.precio_unitario) ORDER BY pi.id) FROM pedido_items pi JOIN productos pr ON pr.id=pi.producto_id WHERE pi.pedido_id=pe.id),'[]'::jsonb) AS items,
  (pe.estado='confirmado' AND pe.fecha_confirmacion >= NOW() - INTERVAL '15 minutes') AS dentro_plazo_anulacion FROM pedidos pe`;

export async function listarPedidos(query = {}) {
  const estado = String(query.estado || '').trim(); const metodo = String(query.metodo_pago || '').trim();
  const { rows } = await pool.query(`${orderSelect} WHERE ($1='' OR pe.estado=$1) AND ($2='' OR pe.metodo_pago=$2) ORDER BY pe.fecha DESC, pe.id DESC`, [estado, metodo]);
  return rows;
}
export async function obtenerPedido(id) {
  const { rows } = await pool.query(`${orderSelect} WHERE pe.id=$1`, [id]);
  if (!rows[0]) throw new AppError(404, 'Venta no encontrada');
  return rows[0];
}

export async function crearPedido(data = {}) {
  const allowed = new Set(['efectivo', 'tarjeta', 'sinpe_movil']);
  if (!allowed.has(data.metodo_pago)) throw new AppError(400, 'El método de pago debe ser efectivo, tarjeta o sinpe_movil');
  const items = validateItems(data.items); const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const ids = items.map((x) => x.producto_id).sort((a,b) => a-b);
    const { rows: products } = await client.query('SELECT id,nombre,precio,categoria,activo,stock FROM productos WHERE id=ANY($1::int[]) ORDER BY id FOR SHARE', [ids]);
    if (products.length !== ids.length) { const have = new Set(products.map((p) => Number(p.id))); const missing = ids.find((id) => !have.has(id)); throw new AppError(404, `El producto ${missing} no existe`); }
    const byId = new Map(products.map((p) => [Number(p.id), p])); let cents = 0; const lines = [];
    for (const item of items) {
      const product = byId.get(item.producto_id);
      if (!product.activo) throw new AppError(409, `${product.nombre} no está disponible para la venta`);
      const priceCents = Math.round(Number(product.precio) * 100); cents += priceCents * item.cantidad;
      lines.push({ ...item, precio_unitario: (priceCents / 100).toFixed(2) });
    }
    const subtotal = cents / 100; const impuesto = Math.round(cents * 0.13) / 100; const total = round2(subtotal + impuesto);
    const { rows: saved } = await client.query(`INSERT INTO pedidos(metodo_pago,subtotal,impuesto,total,estado) VALUES($1,$2,$3,$4,'pendiente') RETURNING id`, [data.metodo_pago, subtotal.toFixed(2), impuesto.toFixed(2), total.toFixed(2)]);
    for (const line of lines) await client.query('INSERT INTO pedido_items(pedido_id,producto_id,cantidad,precio_unitario) VALUES($1,$2,$3,$4)', [saved[0].id,line.producto_id,line.cantidad,line.precio_unitario]);
    await client.query('COMMIT');
    return obtenerPedido(saved[0].id);
  } catch (error) { await client.query('ROLLBACK'); throw error; }
  finally { client.release(); }
}

export async function confirmarPedido(id) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows: orderRows } = await client.query('SELECT * FROM pedidos WHERE id=$1 FOR UPDATE', [id]); const order = orderRows[0];
    if (!order) throw new AppError(404, 'Venta no encontrada');
    if (order.estado !== 'pendiente') throw new AppError(409, `Solo se puede confirmar una venta pendiente; estado actual: ${order.estado}`);
    const { rows: lines } = await client.query('SELECT pi.producto_id, pr.nombre, SUM(pi.cantidad)::int AS cantidad FROM pedido_items pi JOIN productos pr ON pr.id=pi.producto_id WHERE pi.pedido_id=$1 GROUP BY pi.producto_id,pr.nombre ORDER BY pi.producto_id', [id]);
    if (!lines.length) throw new AppError(409, 'La venta no contiene productos');
    const ids = lines.map((line) => Number(line.producto_id));
    const { rows: locked } = await client.query('SELECT id,nombre,stock,activo FROM productos WHERE id=ANY($1::int[]) ORDER BY id FOR UPDATE', [ids]);
    const inventory = new Map(locked.map((p) => [Number(p.id), p]));
    for (const line of lines) {
      const p = inventory.get(Number(line.producto_id));
      if (!p || !p.activo) throw new AppError(409, `${line.nombre} no está disponible`);
      if (Number(p.stock) < Number(line.cantidad)) throw new AppError(409, `Stock insuficiente para ${p.nombre}: se necesitan ${line.cantidad} y quedan ${p.stock}`);
    }
    for (const line of lines) await client.query('UPDATE productos SET stock=stock-$1, updated_at=NOW() WHERE id=$2', [line.cantidad,line.producto_id]);
    await client.query("UPDATE pedidos SET estado='confirmado',fecha_confirmacion=NOW() WHERE id=$1", [id]);
    await client.query('COMMIT');
    return obtenerPedido(id);
  } catch (error) { await client.query('ROLLBACK'); throw error; }
  finally { client.release(); }
}

export async function anularPedido(id) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query('SELECT * FROM pedidos WHERE id=$1 FOR UPDATE', [id]); const order = rows[0];
    if (!order) throw new AppError(404, 'Venta no encontrada');
    if (order.estado === 'anulado') throw new AppError(409, 'La venta ya está anulada');
    if (order.estado === 'pendiente') {
      await client.query("UPDATE pedidos SET estado='anulado' WHERE id=$1", [id]); await client.query('COMMIT'); return obtenerPedido(id);
    }
    if (!order.fecha_confirmacion || Date.now() - new Date(order.fecha_confirmacion).getTime() > 15 * 60 * 1000) throw new AppError(409, 'Fuera del plazo: una venta confirmada solo se puede anular durante los primeros 15 minutos');
    const { rows: lines } = await client.query('SELECT producto_id,SUM(cantidad)::int AS cantidad FROM pedido_items WHERE pedido_id=$1 GROUP BY producto_id ORDER BY producto_id', [id]);
    const ids = lines.map((line) => Number(line.producto_id));
    await client.query('SELECT id FROM productos WHERE id=ANY($1::int[]) ORDER BY id FOR UPDATE', [ids]);
    for (const line of lines) await client.query('UPDATE productos SET stock=stock+$1,updated_at=NOW() WHERE id=$2', [line.cantidad,line.producto_id]);
    await client.query("UPDATE pedidos SET estado='anulado' WHERE id=$1", [id]); await client.query('COMMIT'); return obtenerPedido(id);
  } catch (error) { await client.query('ROLLBACK'); throw error; }
  finally { client.release(); }
}
