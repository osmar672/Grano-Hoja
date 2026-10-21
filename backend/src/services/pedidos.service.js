import { pool } from '../db.js';
import { AppError } from '../utils/AppError.js';

const payments = new Set(['efectivo', 'tarjeta', 'sinpe_movil']);
const round2 = (value) => Math.round((value + Number.EPSILON) * 100) / 100;
function validateItems(items) {
  if (!Array.isArray(items) || items.length === 0) throw new AppError(400, 'El pedido debe incluir al menos un producto');
  const grouped = new Map();
  for (const item of items) {
    const productId = Number(item.producto_id);
    const quantity = Number(item.cantidad);
    if (!Number.isInteger(productId) || productId <= 0 || !Number.isInteger(quantity) || quantity <= 0) throw new AppError(400, 'Cada item necesita producto_id válido y cantidad entera mayor que cero');
    grouped.set(productId, (grouped.get(productId) || 0) + quantity);
  }
  return [...grouped].map(([producto_id, cantidad]) => ({ producto_id, cantidad }));
}

export async function listarPedidos(query) {
  const estado = String(query.estado || '').trim();
  const metodo = String(query.metodo_pago || '').trim();
  const { rows } = await pool.query(`SELECT pe.*,
      COALESCE((SELECT jsonb_agg(jsonb_build_object('producto_id', pi.producto_id, 'nombre', pr.nombre, 'cantidad', pi.cantidad, 'precio_unitario', pi.precio_unitario, 'total_linea', pi.cantidad * pi.precio_unitario) ORDER BY pi.id)
        FROM pedido_items pi JOIN productos pr ON pr.id=pi.producto_id WHERE pi.pedido_id=pe.id), '[]'::jsonb) AS items,
      (pe.estado='confirmado' AND pe.fecha_confirmacion >= NOW() - INTERVAL '15 minutes') AS dentro_plazo_anulacion
    FROM pedidos pe
    WHERE ($1='' OR pe.estado=$1) AND ($2='' OR pe.metodo_pago=$2)
    ORDER BY pe.fecha DESC, pe.id DESC`, [estado, metodo]);
  return rows;
}

export async function obtenerPedido(id) {
  const { rows } = await pool.query('SELECT * FROM pedidos WHERE id=$1', [id]);
  if (!rows[0]) throw new AppError(404, 'Pedido no encontrado');
  const { rows: items } = await pool.query(`SELECT pi.id, pi.pedido_id, pi.producto_id, pr.nombre AS producto, pi.cantidad, pi.precio_unitario,
      ROUND(pi.cantidad * pi.precio_unitario, 2) AS total_linea
    FROM pedido_items pi JOIN productos pr ON pr.id=pi.producto_id WHERE pi.pedido_id=$1 ORDER BY pi.id`, [id]);
  return { ...rows[0], items, dentro_plazo_anulacion: rows[0].estado === 'confirmado' && Date.now() - new Date(rows[0].fecha_confirmacion).getTime() <= 15 * 60 * 1000 };
}

export async function crearPedido(data = {}) {
  data = data ?? {};
  if (!payments.has(data.metodo_pago)) throw new AppError(400, 'metodo_pago debe ser efectivo, tarjeta o sinpe_movil');
  const items = validateItems(data.items);
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    let subtotalCents = 0;
    const productLines = [];
    for (const item of items) {
      const { rows } = await client.query(`SELECT p.id, p.nombre, p.precio, p.activo,
          EXISTS(SELECT 1 FROM recetas r WHERE r.producto_id=p.id) AS tiene_receta
        FROM productos p WHERE p.id=$1 FOR SHARE`, [item.producto_id]);
      const product = rows[0];
      if (!product) throw new AppError(404, `Producto ${item.producto_id} no existe`);
      if (!product.activo) throw new AppError(409, `El producto ${product.nombre} está inactivo`);
      if (!product.tiene_receta) throw new AppError(409, `El producto ${product.nombre} no tiene receta configurada`);
      const priceCents = Math.round(Number(product.precio) * 100);
      subtotalCents += priceCents * item.cantidad;
      productLines.push({ ...item, precio_unitario: (priceCents / 100).toFixed(2) });
    }
    const subtotal = round2(subtotalCents / 100);
    const impuesto = Math.round(subtotalCents * 0.13) / 100;
    const total = round2(subtotal + impuesto);
    const { rows: orderRows } = await client.query(`INSERT INTO pedidos(fecha, metodo_pago, subtotal, impuesto, total, estado)
      VALUES(NOW(),$1,$2,$3,$4,'pendiente') RETURNING *`, [data.metodo_pago, subtotal.toFixed(2), impuesto.toFixed(2), total.toFixed(2)]);
    for (const item of productLines) await client.query('INSERT INTO pedido_items(pedido_id, producto_id, cantidad, precio_unitario) VALUES($1,$2,$3,$4)', [orderRows[0].id, item.producto_id, item.cantidad, item.precio_unitario]);
    await client.query('COMMIT');
    return obtenerPedido(orderRows[0].id);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally { client.release(); }
}

async function requisitosDePedido(client, pedidoId) {
  const { rows } = await client.query(`SELECT r.insumo_id, i.nombre, i.unidad,
      SUM(r.cantidad * pi.cantidad)::numeric(12,3) AS necesario
    FROM pedido_items pi JOIN recetas r ON r.producto_id=pi.producto_id JOIN insumos i ON i.id=r.insumo_id
    WHERE pi.pedido_id=$1 GROUP BY r.insumo_id, i.nombre, i.unidad ORDER BY r.insumo_id ASC`, [pedidoId]);
  if (!rows.length) throw new AppError(409, 'El pedido no tiene recetas válidas para preparar los productos');
  return rows;
}

async function bloquearInsumos(client, requirements) {
  const ids = requirements.map((row) => Number(row.insumo_id));
  // Bloqueo estable por id para evitar que dos transacciones bloqueen los mismos insumos en orden opuesto.
  const { rows } = await client.query('SELECT id, nombre, unidad, stock FROM insumos WHERE id = ANY($1::int[]) ORDER BY id ASC FOR UPDATE', [ids]);
  const byId = new Map(rows.map((row) => [Number(row.id), row]));
  for (const requirement of requirements) {
    const supply = byId.get(Number(requirement.insumo_id));
    if (!supply || Number(supply.stock) + 1e-9 < Number(requirement.necesario)) {
      const actual = supply ? supply.stock : 'no disponible';
      throw new AppError(409, `Insumos insuficientes: ${requirement.nombre}. Necesario: ${requirement.necesario} ${requirement.unidad}; disponible: ${actual}`);
    }
  }
  return byId;
}

export async function confirmarPedido(id) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query('SELECT * FROM pedidos WHERE id=$1 FOR UPDATE', [id]);
    const pedido = rows[0];
    if (!pedido) throw new AppError(404, 'Pedido no encontrado');
    if (pedido.estado !== 'pendiente') throw new AppError(409, `Solo se puede confirmar un pedido pendiente; estado actual: ${pedido.estado}`);
    // Comparte bloqueo de producto mientras lee la receta; una edición de receta no puede cruzarse con esta confirmación.
    await client.query('SELECT pr.id FROM productos pr JOIN pedido_items pi ON pi.producto_id=pr.id WHERE pi.pedido_id=$1 ORDER BY pr.id ASC FOR SHARE OF pr', [id]);
    const requirements = await requisitosDePedido(client, id);
    await bloquearInsumos(client, requirements);
    for (const item of requirements) await client.query('UPDATE insumos SET stock=ROUND(stock - $1::numeric, 3) WHERE id=$2', [item.necesario, item.insumo_id]);
    await client.query("UPDATE pedidos SET estado='confirmado', fecha_confirmacion=NOW() WHERE id=$1", [id]);
    await client.query('COMMIT');
    return obtenerPedido(id);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally { client.release(); }
}

export async function anularPedido(id) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query('SELECT * FROM pedidos WHERE id=$1 FOR UPDATE', [id]);
    const pedido = rows[0];
    if (!pedido) throw new AppError(404, 'Pedido no encontrado');
    if (pedido.estado === 'anulado') throw new AppError(409, 'El pedido ya está anulado');
    if (pedido.estado === 'pendiente') {
      await client.query("UPDATE pedidos SET estado='anulado' WHERE id=$1", [id]);
      await client.query('COMMIT');
      return obtenerPedido(id);
    }
    if (!pedido.fecha_confirmacion || Date.now() - new Date(pedido.fecha_confirmacion).getTime() > 15 * 60 * 1000) {
      throw new AppError(409, 'Fuera del plazo de anulación: solo se puede anular durante los primeros 15 minutos desde la confirmación');
    }
    const requirements = await requisitosDePedido(client, id);
    const ids = requirements.map((row) => Number(row.insumo_id));
    await client.query('SELECT id FROM insumos WHERE id = ANY($1::int[]) ORDER BY id ASC FOR UPDATE', [ids]);
    for (const item of requirements) await client.query('UPDATE insumos SET stock=ROUND(stock + $1::numeric, 3) WHERE id=$2', [item.necesario, item.insumo_id]);
    await client.query("UPDATE pedidos SET estado='anulado' WHERE id=$1", [id]);
    await client.query('COMMIT');
    return obtenerPedido(id);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally { client.release(); }
}
