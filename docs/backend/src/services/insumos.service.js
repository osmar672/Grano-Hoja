import { pool } from '../db.js';
import { AppError } from '../utils/AppError.js';

const sortColumns = { nombre: 'nombre', stock: 'stock', stock_minimo: 'stock_minimo', unidad: 'unidad' };
function validateInsumo(data = {}) {
  data = data ?? {};
  const nombre = typeof data.nombre === 'string' ? data.nombre.trim() : '';
  const unidad = typeof data.unidad === 'string' ? data.unidad.trim() : '';
  const stock = Number(data.stock);
  const stockMinimo = Number(data.stock_minimo);
  if (!nombre || !unidad || !Number.isFinite(stock) || !Number.isFinite(stockMinimo) || stock < 0 || stockMinimo < 0) {
    throw new AppError(400, 'Nombre y unidad son obligatorios; stock y stock_minimo deben ser números mayores o iguales a cero');
  }
  return { nombre, unidad, stock, stock_minimo: stockMinimo };
}

export async function listarInsumos(query) {
  const q = String(query.q || '').trim();
  const bajoMinimo = query.bajo_minimo === 'true';
  const orden = sortColumns[query.orden] || 'nombre';
  const direccion = String(query.direccion).toLowerCase() === 'desc' ? 'DESC' : 'ASC';
  const { rows } = await pool.query(`
    SELECT id, nombre, unidad, stock, stock_minimo,
      (stock < stock_minimo) AS bajo_minimo
    FROM insumos
    WHERE ($1 = '' OR nombre ILIKE '%' || $1 || '%')
      AND (NOT $2 OR stock < stock_minimo)
    ORDER BY ${orden} ${direccion}, id ASC`, [q, bajoMinimo]);
  return rows;
}

export async function obtenerInsumo(id) {
  const { rows } = await pool.query('SELECT id, nombre, unidad, stock, stock_minimo, (stock < stock_minimo) AS bajo_minimo FROM insumos WHERE id = $1', [id]);
  if (!rows[0]) throw new AppError(404, 'Insumo no encontrado');
  return rows[0];
}

export async function crearInsumo(data) {
  const value = validateInsumo(data);
  const { rows } = await pool.query('INSERT INTO insumos(nombre, unidad, stock, stock_minimo) VALUES($1,$2,$3,$4) RETURNING *', [value.nombre, value.unidad, value.stock, value.stock_minimo]);
  return rows[0];
}

export async function actualizarInsumo(id, data, partial = false) {
  data = data ?? {};
  const actual = await obtenerInsumo(id);
  const payload = validateInsumo(partial ? { ...actual, ...data } : data);
  const { rows } = await pool.query('UPDATE insumos SET nombre=$1, unidad=$2, stock=$3, stock_minimo=$4 WHERE id=$5 RETURNING *', [payload.nombre, payload.unidad, payload.stock, payload.stock_minimo, id]);
  return rows[0];
}

export async function eliminarInsumo(id) {
  await obtenerInsumo(id);
  try {
    await pool.query('DELETE FROM insumos WHERE id=$1', [id]);
  } catch (error) {
    if (error.code === '23503') throw new AppError(409, 'No se puede eliminar el insumo porque está usado en una receta');
    throw error;
  }
  return { id: Number(id), eliminado: true };
}

export async function listarBajoMinimo() {
  const { rows } = await pool.query('SELECT id, nombre, unidad, stock, stock_minimo, (stock_minimo - stock) AS faltante_minimo FROM insumos WHERE stock < stock_minimo ORDER BY (stock_minimo - stock) DESC, id ASC');
  return rows;
}
