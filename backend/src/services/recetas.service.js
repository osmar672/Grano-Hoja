import { pool } from '../db.js';
import { AppError } from '../utils/AppError.js';

const inSql = (ids) => ids.map(() => '?').join(',');

export async function obtenerRecetaProducto(productoId) {
  const { rows: products } = await pool.query('SELECT id,nombre FROM productos WHERE id=?', [productoId]);
  if (!products[0]) throw new AppError(404, 'Producto no encontrado');
  const { rows } = await pool.query(`SELECT r.insumo_id, i.nombre, i.unidad, r.cantidad, i.activo
    FROM recetas r JOIN insumos i ON i.id=r.insumo_id
    WHERE r.producto_id=? ORDER BY i.nombre,i.id`, [productoId]);
  return { producto_id: Number(products[0].id), producto: products[0].nombre, items: rows.map((row) => ({
    insumo_id: Number(row.insumo_id), nombre: row.nombre, unidad: row.unidad,
    cantidad: Number(row.cantidad), activo: Boolean(row.activo),
  })) };
}

export async function reemplazarRecetaProducto(productoId, data = {}) {
  const items = Array.isArray(data.items) ? data.items : null;
  if (!items) throw new AppError(400, 'La receta debe incluir una lista de ingredientes');
  const normalized = items.map((item) => ({ insumo_id: Number(item.insumo_id), cantidad: Number(item.cantidad) }));
  if (normalized.some((item) => !Number.isInteger(item.insumo_id) || item.insumo_id <= 0 || !Number.isFinite(item.cantidad) || item.cantidad <= 0)) {
    throw new AppError(400, 'Cada ingrediente requiere un ID válido y una cantidad mayor que cero');
  }
  if (new Set(normalized.map((item) => item.insumo_id)).size !== normalized.length) {
    throw new AppError(400, 'No repitas un insumo dentro de la misma receta');
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows: products } = await client.query('SELECT id FROM productos WHERE id=? FOR UPDATE', [productoId]);
    if (!products[0]) throw new AppError(404, 'Producto no encontrado');
    const ids = [...normalized.map((item) => item.insumo_id)].sort((a, b) => a - b);
    if (ids.length) {
      const { rows: ingredients } = await client.query(`SELECT id,nombre,activo FROM insumos WHERE id IN (${inSql(ids)}) ORDER BY id FOR SHARE`, ids);
      const byId = new Map(ingredients.map((item) => [Number(item.id), item]));
      for (const id of ids) {
        const ingredient = byId.get(id);
        if (!ingredient) throw new AppError(409, `El insumo ${id} no existe`);
        if (!ingredient.activo) throw new AppError(409, `El insumo ${ingredient.nombre} está inactivo y no puede usarse en una receta`);
      }
    }
    await client.query('DELETE FROM recetas WHERE producto_id=?', [productoId]);
    for (const item of normalized) {
      await client.query('INSERT INTO recetas(producto_id,insumo_id,cantidad) VALUES(?,?,?)', [productoId, item.insumo_id, item.cantidad]);
    }
    await client.query('COMMIT');
    return await obtenerRecetaProducto(productoId);
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    if (error?.code === 'ER_NO_REFERENCED_ROW_2') throw new AppError(409, 'El producto o un insumo de la receta ya no existe');
    throw error;
  } finally {
    client.release();
  }
}
