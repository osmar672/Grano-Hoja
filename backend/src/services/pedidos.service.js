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

const orderSelect = `SELECT pe.*,
  (pe.estado='confirmado' AND pe.fecha_confirmacion >= DATE_SUB(UTC_TIMESTAMP(3), INTERVAL 15 MINUTE)) AS dentro_plazo_anulacion
  FROM pedidos pe`;

async function attachItems(orders) {
  if (!orders.length) return orders;
  const ids = orders.map((order) => Number(order.id));
  const placeholders = ids.map(() => '?').join(',');
  const { rows: items } = await pool.query(`SELECT pi.pedido_id, pi.producto_id, pr.nombre, pr.categoria,
      pi.cantidad, pi.precio_unitario, (pi.cantidad * pi.precio_unitario) AS total_linea
    FROM pedido_items pi JOIN productos pr ON pr.id=pi.producto_id
    WHERE pi.pedido_id IN (${placeholders}) ORDER BY pi.pedido_id, pi.id`, ids);
  const byOrder = new Map(ids.map((id) => [id, []]));
  for (const item of items) byOrder.get(Number(item.pedido_id))?.push({
    producto_id: Number(item.producto_id), nombre: item.nombre, categoria: item.categoria,
    cantidad: Number(item.cantidad), precio_unitario: Number(item.precio_unitario), total_linea: Number(item.total_linea),
  });
  for (const order of orders) order.items = byOrder.get(Number(order.id)) || [];
  return orders;
}

export async function listarPedidos(query = {}) {
  const estado = String(query.estado || '').trim(); const metodo = String(query.metodo_pago || '').trim();
  const { rows } = await pool.query(`${orderSelect}
    WHERE (? = '' OR pe.estado = ?) AND (? = '' OR pe.metodo_pago = ?)
    ORDER BY pe.fecha DESC, pe.id DESC`, [estado, estado, metodo, metodo]);
  return attachItems(rows);
}

export async function obtenerPedido(id) {
  const { rows } = await pool.query(`${orderSelect} WHERE pe.id=?`, [id]);
  if (!rows[0]) throw new AppError(404, 'Venta no encontrada');
  const [order] = await attachItems(rows);
  return order;
}

function inSql(ids) { return ids.map(() => '?').join(','); }

export async function crearPedido(data = {}) {
  const allowed = new Set(['efectivo', 'tarjeta', 'sinpe_movil']);
  if (!allowed.has(data.metodo_pago)) throw new AppError(400, 'El método de pago debe ser efectivo, tarjeta o sinpe_movil');
  const items = validateItems(data.items); const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const ids = items.map((x) => x.producto_id).sort((a,b) => a-b);
    const { rows: products } = await client.query(`SELECT id,nombre,precio,categoria,activo,stock FROM productos WHERE id IN (${inSql(ids)}) ORDER BY id FOR SHARE`, ids);
    if (products.length !== ids.length) { const have = new Set(products.map((p) => Number(p.id))); const missing = ids.find((id) => !have.has(id)); throw new AppError(404, `El producto ${missing} no existe`); }
    const byId = new Map(products.map((p) => [Number(p.id), p])); let cents = 0; const lines = [];
    for (const item of items) {
      const product = byId.get(item.producto_id);
      if (!product.activo) throw new AppError(409, `${product.nombre} no está disponible para la venta`);
      const priceCents = Math.round(Number(product.precio) * 100); cents += priceCents * item.cantidad;
      lines.push({ ...item, precio_unitario: (priceCents / 100).toFixed(2) });
    }
    const subtotal = cents / 100; const impuesto = Math.round(cents * 0.13) / 100; const total = round2(subtotal + impuesto);
    const saved = await client.query(`INSERT INTO pedidos(metodo_pago,subtotal,impuesto,total,estado) VALUES(?,?,?,?,'pendiente')`,
      [data.metodo_pago, subtotal.toFixed(2), impuesto.toFixed(2), total.toFixed(2)]);
    const orderId = saved.insertId;
    for (const line of lines) await client.query('INSERT INTO pedido_items(pedido_id,producto_id,cantidad,precio_unitario) VALUES(?,?,?,?)', [orderId,line.producto_id,line.cantidad,line.precio_unitario]);
    await client.query('COMMIT');
    return obtenerPedido(orderId);
  } catch (error) { await client.query('ROLLBACK').catch(() => {}); throw error; }
  finally { client.release(); }
}

export async function confirmarPedido(id) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows: orderRows } = await client.query('SELECT * FROM pedidos WHERE id=? FOR UPDATE', [id]); const order = orderRows[0];
    if (!order) throw new AppError(404, 'Venta no encontrada');
    if (order.estado !== 'pendiente') throw new AppError(409, `Solo se puede confirmar una venta pendiente; estado actual: ${order.estado}`);
    const { rows: lines } = await client.query(`SELECT pi.producto_id, pr.nombre, SUM(pi.cantidad) AS cantidad
      FROM pedido_items pi JOIN productos pr ON pr.id=pi.producto_id WHERE pi.pedido_id=?
      GROUP BY pi.producto_id,pr.nombre ORDER BY pi.producto_id`, [id]);
    if (!lines.length) throw new AppError(409, 'La venta no contiene productos');
    const ids = lines.map((line) => Number(line.producto_id));
    const { rows: locked } = await client.query(`SELECT id,nombre,stock,activo FROM productos WHERE id IN (${inSql(ids)}) ORDER BY id FOR UPDATE`, ids);
    const inventory = new Map(locked.map((p) => [Number(p.id), p]));
    for (const line of lines) {
      const product = inventory.get(Number(line.producto_id));
      if (!product || !product.activo) throw new AppError(409, `${line.nombre} no está disponible`);
      if (Number(product.stock) < Number(line.cantidad)) throw new AppError(409, `Stock insuficiente para ${product.nombre}: se necesitan ${line.cantidad} y quedan ${product.stock}`);
    }
    for (const line of lines) await client.query('UPDATE productos SET stock=stock-?, updated_at=UTC_TIMESTAMP(3) WHERE id=?', [Number(line.cantidad),line.producto_id]);
    await client.query("UPDATE pedidos SET estado='confirmado',fecha_confirmacion=UTC_TIMESTAMP(3) WHERE id=?", [id]);
    await client.query('COMMIT');
    return obtenerPedido(id);
  } catch (error) { await client.query('ROLLBACK').catch(() => {}); throw error; }
  finally { client.release(); }
}

export async function anularPedido(id) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query('SELECT * FROM pedidos WHERE id=? FOR UPDATE', [id]); const order = rows[0];
    if (!order) throw new AppError(404, 'Venta no encontrada');
    if (order.estado === 'anulado') throw new AppError(409, 'La venta ya está anulada');
    if (order.estado === 'pendiente') {
      await client.query("UPDATE pedidos SET estado='anulado' WHERE id=?", [id]);
      await client.query('COMMIT');
      return obtenerPedido(id);
    }
    const confirmedAt = order.fecha_confirmacion ? new Date(order.fecha_confirmacion).getTime() : 0;
    if (!confirmedAt || confirmedAt < Date.now() - 15 * 60 * 1000) {
      throw new AppError(409, 'Fuera del plazo: una venta confirmada solo se puede anular durante los primeros 15 minutos');
    }
    const { rows: lines } = await client.query('SELECT producto_id,SUM(cantidad) AS cantidad FROM pedido_items WHERE pedido_id=? GROUP BY producto_id ORDER BY producto_id', [id]);
    const ids = lines.map((line) => Number(line.producto_id));
    if (ids.length) await client.query(`SELECT id FROM productos WHERE id IN (${inSql(ids)}) ORDER BY id FOR UPDATE`, ids);
    for (const line of lines) await client.query('UPDATE productos SET stock=stock+?,updated_at=UTC_TIMESTAMP(3) WHERE id=?', [Number(line.cantidad),line.producto_id]);
    await client.query("UPDATE pedidos SET estado='anulado' WHERE id=?", [id]);
    await client.query('COMMIT');
    return obtenerPedido(id);
  } catch (error) { await client.query('ROLLBACK').catch(() => {}); throw error; }
  finally { client.release(); }
}
