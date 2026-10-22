import { pool } from '../db.js';
import { AppError } from '../utils/AppError.js';

const sortColumns = { nombre: 'p.nombre', precio: 'p.precio', categoria: 'p.categoria', stock: 'p.stock' };
const allowedCategories = new Set(['bebidas_calientes', 'bebidas_frias', 'reposteria', 'comida', 'plantas', 'muebles', 'decoracion']);
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

function mysqlDuplicate(error) { return error?.code === 'ER_DUP_ENTRY'; }
function mysqlForeignKey(error) { return ['ER_ROW_IS_REFERENCED_2', 'ER_NO_REFERENCED_ROW_2'].includes(error?.code); }

export async function listarProductos(query = {}) {
  const q = String(query.q || '').trim(); const categoria = String(query.categoria || '').trim();
  const order = sortColumns[query.orden] || 'p.nombre'; const direction = String(query.direccion).toLowerCase() === 'desc' ? 'DESC' : 'ASC';
  const activo = query.activo === 'true' ? true : query.activo === 'false' ? false : null;
  const lowOnly = query.bajo_stock === 'true';
  const { rows } = await pool.query(`SELECT p.*,
      (p.stock < p.stock_minimo) AS bajo_stock,
      COALESCE((SELECT SUM(pi.cantidad) FROM pedido_items pi JOIN pedidos pe ON pe.id=pi.pedido_id
        WHERE pi.producto_id=p.id AND pe.estado='confirmado' AND pe.fecha_confirmacion >= DATE_SUB(UTC_TIMESTAMP(3), INTERVAL 7 DAY)),0) AS unidades_vendidas_7_dias
    FROM productos p
    WHERE (? = '' OR p.nombre LIKE CONCAT('%', ?, '%') OR p.descripcion LIKE CONCAT('%', ?, '%'))
      AND (? = '' OR p.categoria = ?)
      AND (? IS NULL OR p.activo = ?)
      AND (? = 0 OR p.stock < p.stock_minimo)
    ORDER BY ${order} ${direction}, p.id ASC`, [q, q, q, categoria, categoria, activo, activo, lowOnly ? 1 : 0]);
  return rows;
}

export async function obtenerProducto(id) {
  const { rows } = await pool.query(`SELECT p.*, (p.stock < p.stock_minimo) AS bajo_stock,
      COALESCE((SELECT SUM(pi.cantidad) FROM pedido_items pi JOIN pedidos pe ON pe.id=pi.pedido_id
        WHERE pi.producto_id=p.id AND pe.estado='confirmado' AND pe.fecha_confirmacion >= DATE_SUB(UTC_TIMESTAMP(3), INTERVAL 30 DAY)),0) AS unidades_vendidas_30_dias
    FROM productos p WHERE p.id=?`, [id]);
  if (!rows[0]) throw new AppError(404, 'Producto no encontrado');
  return rows[0];
}

export async function crearProducto(data) {
  const value = validateProduct(data);
  try {
    const result = await pool.query(`INSERT INTO productos(nombre, descripcion, precio, categoria, stock, stock_minimo, activo)
      VALUES(?,?,?,?,?,?,?)`, [value.nombre, value.descripcion, value.precio, value.categoria, value.stock, value.stock_minimo, value.activo]);
    return obtenerProducto(result.insertId);
  } catch (error) { if (mysqlDuplicate(error)) throw new AppError(409, 'Ya existe un producto con ese nombre'); throw error; }
}

export async function actualizarProducto(id, data, partial = false) {
  const actual = await obtenerProducto(id);
  const merged = partial ? { nombre: actual.nombre, descripcion: actual.descripcion, precio: Number(actual.precio), categoria: actual.categoria, stock: actual.stock, stock_minimo: actual.stock_minimo, activo: actual.activo, ...data } : data;
  const value = validateProduct(merged);
  try {
    await pool.query(`UPDATE productos SET nombre=?, descripcion=?, precio=?, categoria=?, stock=?, stock_minimo=?, activo=?, updated_at=UTC_TIMESTAMP(3) WHERE id=?`,
      [value.nombre, value.descripcion, value.precio, value.categoria, value.stock, value.stock_minimo, value.activo, id]);
    return obtenerProducto(id);
  } catch (error) { if (mysqlDuplicate(error)) throw new AppError(409, 'Ya existe un producto con ese nombre'); throw error; }
}

export async function eliminarProducto(id) {
  await obtenerProducto(id);
  try { await pool.query('DELETE FROM productos WHERE id=?', [id]); }
  catch (error) { if (mysqlForeignKey(error)) throw new AppError(409, 'No se puede eliminar un producto que aparece en el historial de ventas'); throw error; }
  return { id: Number(id), eliminado: true };
}
