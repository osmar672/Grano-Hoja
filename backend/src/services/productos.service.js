import { pool } from '../db.js';
import { AppError } from '../utils/AppError.js';

const sortColumns = { nombre: 'nombre', precio: 'precio', categoria: 'categoria', stock: 'stock' };
const allowedCategories = new Set(['plantas', 'muebles', 'decoracion']);
function validateProduct(data = {}) {
  const nombre = typeof data.nombre === 'string' ? data.nombre.trim() : '';
  const descripcion = typeof data.descripcion === 'string' ? data.descripcion.trim() : '';
  const precio = Number(data.precio); const stock = Number(data.stock); const stockMinimo = Number(data.stock_minimo);
  const categoria = String(data.categoria || '').trim(); const activo = data.activo === undefined ? true : data.activo;
  if (!nombre || nombre.length > 140 || descripcion.length > 1200 || !allowedCategories.has(categoria)
      || !Number.isFinite(precio) || precio <= 0 || !Number.isInteger(stock) || stock < 0
      || !Number.isInteger(stockMinimo) || stockMinimo < 0 || typeof activo !== 'boolean') {
    throw new AppError(400, 'Comprueba nombre, descripción, categoría, precio positivo y existencias enteras no negativas');
  }
  if (/[<>\u0000-\u001F\u007F]/.test(nombre + descripcion)) throw new AppError(400, 'El texto contiene caracteres no permitidos');
  return { nombre, descripcion, precio: Math.round(precio * 100) / 100, categoria, stock, stock_minimo: stockMinimo, activo };
}

export async function listarProductos(query = {}) {
  const q = String(query.q || '').trim(); const categoria = String(query.categoria || '').trim();
  const order = sortColumns[query.orden] || 'nombre'; const direction = String(query.direccion).toLowerCase() === 'desc' ? 'DESC' : 'ASC';
  const activo = query.activo === 'true' ? true : query.activo === 'false' ? false : null;
  const lowOnly = query.bajo_stock === 'true';
  const { rows } = await pool.query(`SELECT p.*, (p.stock < p.stock_minimo) AS bajo_stock,
      COALESCE(s.unidades_vendidas_7_dias,0)::int AS unidades_vendidas_7_dias
    FROM productos p
    LEFT JOIN LATERAL (SELECT SUM(pi.cantidad) AS unidades_vendidas_7_dias FROM pedido_items pi JOIN pedidos pe ON pe.id=pi.pedido_id
      WHERE pi.producto_id=p.id AND pe.estado='confirmado' AND pe.fecha_confirmacion >= NOW() - INTERVAL '7 days') s ON TRUE
    WHERE ($1='' OR p.nombre ILIKE '%' || $1 || '%' OR p.descripcion ILIKE '%' || $1 || '%')
      AND ($2='' OR p.categoria=$2) AND ($3::boolean IS NULL OR p.activo=$3)
      AND (NOT $4 OR p.stock < p.stock_minimo)
    ORDER BY ${order} ${direction}, p.id ASC`, [q, categoria, activo, lowOnly]);
  return rows;
}

export async function obtenerProducto(id) {
  const { rows } = await pool.query(`SELECT p.*, (p.stock < p.stock_minimo) AS bajo_stock,
      COALESCE(s.unidades_vendidas_30_dias,0)::int AS unidades_vendidas_30_dias
    FROM productos p LEFT JOIN LATERAL (SELECT SUM(pi.cantidad) AS unidades_vendidas_30_dias
      FROM pedido_items pi JOIN pedidos pe ON pe.id=pi.pedido_id WHERE pi.producto_id=p.id AND pe.estado='confirmado'
      AND pe.fecha_confirmacion >= NOW() - INTERVAL '30 days') s ON TRUE WHERE p.id=$1`, [id]);
  if (!rows[0]) throw new AppError(404, 'Producto no encontrado');
  return rows[0];
}

export async function crearProducto(data) {
  const value = validateProduct(data);
  try {
    const { rows } = await pool.query(`INSERT INTO productos(nombre, descripcion, precio, categoria, stock, stock_minimo, activo)
      VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING *`, [value.nombre, value.descripcion, value.precio, value.categoria, value.stock, value.stock_minimo, value.activo]);
    return rows[0];
  } catch (error) { if (error.code === '23505') throw new AppError(409, 'Ya existe un producto con ese nombre'); throw error; }
}

export async function actualizarProducto(id, data, partial = false) {
  const actual = await obtenerProducto(id);
  const merged = partial ? { nombre: actual.nombre, descripcion: actual.descripcion, precio: Number(actual.precio), categoria: actual.categoria, stock: actual.stock, stock_minimo: actual.stock_minimo, activo: actual.activo, ...data } : data;
  const value = validateProduct(merged);
  try {
    const { rows } = await pool.query(`UPDATE productos SET nombre=$1, descripcion=$2, precio=$3, categoria=$4, stock=$5,
      stock_minimo=$6, activo=$7, updated_at=NOW() WHERE id=$8 RETURNING *`, [value.nombre, value.descripcion, value.precio, value.categoria, value.stock, value.stock_minimo, value.activo, id]);
    if (!rows[0]) throw new AppError(404, 'Producto no encontrado');
    return rows[0];
  } catch (error) { if (error.code === '23505') throw new AppError(409, 'Ya existe un producto con ese nombre'); throw error; }
}

export async function eliminarProducto(id) {
  await obtenerProducto(id);
  try { await pool.query('DELETE FROM productos WHERE id=$1', [id]); }
  catch (error) { if (error.code === '23503') throw new AppError(409, 'No se puede eliminar un producto que aparece en el historial de ventas'); throw error; }
  return { id: Number(id), eliminado: true };
}
