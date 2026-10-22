import { pool } from '../db.js';
import { AppError } from '../utils/AppError.js';

const sortColumns = { nombre: 'nombre', stock: 'stock_actual', stock_actual: 'stock_actual', stock_minimo: 'stock_minimo', unidad: 'unidad' };
const round3 = (value) => Math.round((value + Number.EPSILON) * 1000) / 1000;

function validateInsumo(data = {}) {
  const nombre = typeof data.nombre === 'string' ? data.nombre.trim() : '';
  const unidad = typeof data.unidad === 'string' ? data.unidad.trim() : '';
  const stock = Number(data.stock ?? data.stock_actual);
  const stockMinimo = Number(data.stock_minimo);
  const activo = data.activo === undefined ? true : data.activo;
  const decimalOk = (value) => Number.isFinite(value) && Math.abs(value * 1000 - Math.round(value * 1000)) < 1e-7;
  if (!nombre || nombre.length > 120 || /[<>\u0000-\u001F\u007F]/.test(nombre)
      || !unidad || unidad.length > 20 || /[<>\u0000-\u001F\u007F]/.test(unidad)
      || !decimalOk(stock) || !decimalOk(stockMinimo) || stock < 0 || stockMinimo < 0
      || stock > 999999999.999 || stockMinimo > 999999999.999 || typeof activo !== 'boolean') {
    throw new AppError(400, 'Comprueba nombre, unidad, stock decimal no negativo y estado del insumo');
  }
  return { nombre, unidad, stock: round3(stock), stock_minimo: round3(stockMinimo), activo };
}

function mapInsumo(row) {
  if (!row) return row;
  const stock = Number(row.stock_actual ?? row.stock ?? 0);
  return { ...row, stock, stock_actual: stock, stock_minimo: Number(row.stock_minimo), activo: Boolean(row.activo), bajo_minimo: stock < Number(row.stock_minimo) };
}
function mysqlDuplicate(error) { return error?.code === 'ER_DUP_ENTRY'; }
function mysqlForeignKey(error) { return ['ER_ROW_IS_REFERENCED_2', 'ER_NO_REFERENCED_ROW_2'].includes(error?.code); }

export async function listarInsumos(query = {}) {
  const q = String(query.q || '').trim();
  const bajoMinimo = query.bajo_minimo === 'true';
  const orden = sortColumns[query.orden] || 'nombre';
  const direccion = String(query.direccion || 'asc').toLowerCase() === 'desc' ? 'DESC' : 'ASC';
  const { rows } = await pool.query(`
    SELECT id, nombre, unidad, stock_actual, stock_actual AS stock, stock_minimo, activo, created_at, updated_at,
      (stock_actual < stock_minimo) AS bajo_minimo
    FROM insumos
    WHERE (? = '' OR LOWER(nombre) LIKE CONCAT('%', LOWER(?), '%'))
      AND (? = 0 OR stock_actual < stock_minimo)
    ORDER BY ${orden} ${direccion}, id ASC`, [q, q, bajoMinimo ? 1 : 0]);
  return rows.map(mapInsumo);
}

export async function listarInsumosActivos() {
  const { rows } = await pool.query(`SELECT id,nombre,unidad,stock_actual,stock_actual AS stock,stock_minimo,activo
    FROM insumos WHERE activo=1 ORDER BY nombre,id`);
  return rows.map(mapInsumo);
}

export async function obtenerInsumo(id) {
  const { rows } = await pool.query(`SELECT id,nombre,unidad,stock_actual,stock_actual AS stock,stock_minimo,activo,created_at,updated_at,
    (stock_actual < stock_minimo) AS bajo_minimo FROM insumos WHERE id=?`, [id]);
  if (!rows[0]) throw new AppError(404, 'Insumo no encontrado');
  return mapInsumo(rows[0]);
}

export async function crearInsumo(data) {
  const value = validateInsumo(data);
  try {
    const result = await pool.query('INSERT INTO insumos(nombre,unidad,stock_actual,stock_minimo,activo) VALUES(?,?,?,?,?)',
      [value.nombre, value.unidad, value.stock, value.stock_minimo, value.activo]);
    return obtenerInsumo(result.insertId);
  } catch (error) {
    if (mysqlDuplicate(error)) throw new AppError(409, 'Ya existe un insumo con ese nombre');
    throw error;
  }
}

export async function actualizarInsumo(id, data, partial = false) {
  const actual = await obtenerInsumo(id);
  const merged = partial
    ? { nombre: actual.nombre, unidad: actual.unidad, stock: actual.stock, stock_minimo: actual.stock_minimo, activo: actual.activo, ...data }
    : { ...data, activo: data?.activo ?? actual.activo };
  const value = validateInsumo(merged);
  try {
    await pool.query(`UPDATE insumos SET nombre=?,unidad=?,stock_actual=?,stock_minimo=?,activo=?,updated_at=UTC_TIMESTAMP(3) WHERE id=?`,
      [value.nombre, value.unidad, value.stock, value.stock_minimo, value.activo, id]);
    return obtenerInsumo(id);
  } catch (error) {
    if (mysqlDuplicate(error)) throw new AppError(409, 'Ya existe un insumo con ese nombre');
    throw error;
  }
}

export async function eliminarInsumo(id) {
  await obtenerInsumo(id);
  try {
    await pool.query('DELETE FROM insumos WHERE id=?', [id]);
  } catch (error) {
    if (mysqlForeignKey(error)) throw new AppError(409, 'No se puede eliminar el insumo porque está usado en una receta o tiene movimientos de inventario');
    throw error;
  }
  return { id: Number(id), eliminado: true };
}

export async function listarBajoMinimo() {
  const { rows } = await pool.query(`SELECT id,nombre,unidad,stock_actual,stock_actual AS stock,stock_minimo,
    (stock_minimo-stock_actual) AS faltante_minimo FROM insumos WHERE activo=1 AND stock_actual < stock_minimo
    ORDER BY (stock_minimo-stock_actual) DESC,id ASC`);
  return rows.map(mapInsumo);
}
