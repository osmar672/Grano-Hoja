import { pool } from '../db.js';
import { AppError } from '../utils/AppError.js';

const sortColumns = { nombre: 'p.nombre', precio: 'p.precio', categoria: 'p.categoria' };
function validateProduct(data = {}) {
  data = data ?? {};
  const nombre = typeof data.nombre === 'string' ? data.nombre.trim() : '';
  const categoria = typeof data.categoria === 'string' ? data.categoria.trim() : '';
  const precio = Number(data.precio);
  const activo = data.activo === undefined ? true : data.activo;
  if (!nombre || !categoria || !Number.isFinite(precio) || precio <= 0 || typeof activo !== 'boolean') {
    throw new AppError(400, 'Nombre y categoría son obligatorios; precio debe ser mayor que cero y activo debe ser booleano');
  }
  if (!Array.isArray(data.receta) || data.receta.length === 0) throw new AppError(400, 'La receta debe incluir al menos un insumo');
  const receta = data.receta.map((item) => ({ insumo_id: Number(item.insumo_id), cantidad: Number(item.cantidad) }));
  if (receta.some((item) => !Number.isInteger(item.insumo_id) || item.insumo_id <= 0 || !Number.isFinite(item.cantidad) || item.cantidad <= 0)) {
    throw new AppError(400, 'Cada ingrediente necesita un insumo_id válido y una cantidad mayor que cero');
  }
  if (new Set(receta.map((item) => item.insumo_id)).size !== receta.length) throw new AppError(400, 'No repitas el mismo insumo en una receta');
  return { nombre, precio: Math.round(precio * 100) / 100, categoria, activo, receta };
}

const availabilitySelect = `
  SELECT p.id, p.nombre, p.precio, p.categoria, p.activo,
    COALESCE(d.porciones_disponibles, 0)::int AS porciones_disponibles,
    (p.activo AND COALESCE(d.porciones_disponibles, 0) > 0) AS disponible
  FROM productos p
  LEFT JOIN LATERAL (
    SELECT FLOOR(MIN(i.stock / r.cantidad)) AS porciones_disponibles
    FROM recetas r JOIN insumos i ON i.id = r.insumo_id
    WHERE r.producto_id = p.id
  ) d ON TRUE`;

export async function listarProductos(query) {
  const q = String(query.q || '').trim();
  const categoria = String(query.categoria || '').trim();
  const orden = sortColumns[query.orden] || 'p.nombre';
  const direccion = String(query.direccion).toLowerCase() === 'desc' ? 'DESC' : 'ASC';
  const activo = query.activo === 'true' ? true : query.activo === 'false' ? false : null;
  const { rows } = await pool.query(`${availabilitySelect}
    WHERE ($1 = '' OR p.nombre ILIKE '%' || $1 || '%')
      AND ($2 = '' OR p.categoria = $2)
      AND ($3::boolean IS NULL OR p.activo = $3)
    ORDER BY ${orden} ${direccion}, p.id ASC`, [q, categoria, activo]);
  return rows;
}

export async function obtenerProducto(id) {
  const { rows } = await pool.query(`${availabilitySelect} WHERE p.id=$1`, [id]);
  if (!rows[0]) throw new AppError(404, 'Producto no encontrado');
  const { rows: receta } = await pool.query(`SELECT r.insumo_id, i.nombre AS insumo, i.unidad, r.cantidad, i.stock, i.stock_minimo
    FROM recetas r JOIN insumos i ON i.id=r.insumo_id WHERE r.producto_id=$1 ORDER BY i.nombre`, [id]);
  return { ...rows[0], receta };
}

async function ensureIngredients(client, receta) {
  const ids = receta.map((r) => r.insumo_id);
  const { rows } = await client.query('SELECT id FROM insumos WHERE id = ANY($1::int[])', [ids]);
  if (rows.length !== ids.length) throw new AppError(400, 'Uno o más insumos de la receta no existen');
}

export async function crearProducto(data) {
  const value = validateProduct(data);
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await ensureIngredients(client, value.receta);
    const { rows } = await client.query('INSERT INTO productos(nombre, precio, categoria, activo) VALUES($1,$2,$3,$4) RETURNING *', [value.nombre, value.precio, value.categoria, value.activo]);
    for (const item of value.receta) await client.query('INSERT INTO recetas(producto_id, insumo_id, cantidad) VALUES($1,$2,$3)', [rows[0].id, item.insumo_id, item.cantidad]);
    await client.query('COMMIT');
    return obtenerProducto(rows[0].id);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally { client.release(); }
}

export async function actualizarProducto(id, data, partial = false) {
  data = data ?? {};
  const actual = await obtenerProducto(id);
  const payloadData = partial ? { ...actual, ...data, receta: data.receta ?? actual.receta.map((r) => ({ insumo_id: r.insumo_id, cantidad: r.cantidad })) } : data;
  const value = validateProduct(payloadData);
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    // Bloquea la fila del producto antes de revisar pedidos; así la confirmación y la edición no cruzan sus cambios de receta.
    const { rows: lockedProducts } = await client.query('SELECT id FROM productos WHERE id=$1 FOR UPDATE', [id]);
    if (!lockedProducts[0]) throw new AppError(404, 'Producto no encontrado');
    // La receta permanece estable durante los 15 min de anulación para poder devolver las cantidades correctas.
    const { rows: ventana } = await client.query(`SELECT 1 FROM pedido_items pi JOIN pedidos pe ON pe.id=pi.pedido_id
      WHERE pi.producto_id=$1 AND pe.estado='confirmado' AND pe.fecha_confirmacion >= NOW() - INTERVAL '15 minutes' LIMIT 1`, [id]);
    if (ventana.length) throw new AppError(409, 'No se puede modificar la receta durante los 15 minutos en que el pedido puede anularse');
    await ensureIngredients(client, value.receta);
    const { rows } = await client.query('UPDATE productos SET nombre=$1, precio=$2, categoria=$3, activo=$4 WHERE id=$5 RETURNING *', [value.nombre, value.precio, value.categoria, value.activo, id]);
    if (!rows[0]) throw new AppError(404, 'Producto no encontrado');
    await client.query('DELETE FROM recetas WHERE producto_id=$1', [id]);
    for (const item of value.receta) await client.query('INSERT INTO recetas(producto_id, insumo_id, cantidad) VALUES($1,$2,$3)', [id, item.insumo_id, item.cantidad]);
    await client.query('COMMIT');
    return obtenerProducto(id);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally { client.release(); }
}

export async function eliminarProducto(id) {
  await obtenerProducto(id);
  const { rows: uses } = await pool.query('SELECT 1 FROM pedido_items WHERE producto_id=$1 LIMIT 1', [id]);
  if (uses.length) throw new AppError(409, 'No se puede eliminar un producto que aparece en el historial de pedidos');
  await pool.query('DELETE FROM productos WHERE id=$1', [id]);
  return { id: Number(id), eliminado: true };
}
