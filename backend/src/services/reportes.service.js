import { pool } from '../db.js';

export async function obtenerProductosBajoStock() {
  const { rows } = await pool.query(`SELECT id,nombre,categoria,stock,stock_minimo,(stock_minimo-stock) AS faltante_minimo
    FROM productos WHERE activo=TRUE AND stock<stock_minimo ORDER BY (stock_minimo-stock) DESC,nombre ASC`);
  return rows;
}

export async function obtenerVentasSemana() {
  const { rows } = await pool.query(`SELECT p.id AS producto_id,p.nombre AS producto,p.categoria,
      COALESCE(SUM(CASE WHEN pe.id IS NOT NULL THEN pi.cantidad ELSE 0 END),0) AS unidades_vendidas_7_dias,
      COALESCE(ROUND(SUM(CASE WHEN pe.id IS NOT NULL THEN pi.cantidad*pi.precio_unitario ELSE 0 END),2),0) AS total_vendido
    FROM productos p
    LEFT JOIN pedido_items pi ON pi.producto_id=p.id
    LEFT JOIN pedidos pe ON pe.id=pi.pedido_id AND pe.estado='confirmado' AND pe.fecha_confirmacion>=DATE_SUB(UTC_TIMESTAMP(3),INTERVAL 7 DAY)
    WHERE p.activo=TRUE GROUP BY p.id,p.nombre,p.categoria
    ORDER BY unidades_vendidas_7_dias DESC,p.nombre ASC`);
  return { desde: new Date(Date.now()-7*24*60*60*1000).toISOString(), hasta: new Date().toISOString(), ventas_por_producto: rows };
}


// Consumo real registrado al confirmar pedidos; no se recalcula con recetas actuales.
export async function obtenerConsumoInsumosSemana() {
  const { rows } = await pool.query(`SELECT i.id AS insumo_id, i.nombre AS insumo, i.unidad,
      i.stock_actual, i.stock_minimo,
      COALESCE(SUM(mi.cantidad),0) AS consumo_7_dias
    FROM insumos i
    LEFT JOIN movimientos_inventario mi ON mi.insumo_id=i.id AND mi.tipo='consumo'
    LEFT JOIN pedidos pe ON pe.id=mi.pedido_id AND pe.estado='confirmado'
      AND pe.fecha_confirmacion >= DATE_SUB(UTC_TIMESTAMP(3), INTERVAL 7 DAY)
    WHERE i.activo=1
    GROUP BY i.id,i.nombre,i.unidad,i.stock_actual,i.stock_minimo
    ORDER BY consumo_7_dias DESC,i.nombre ASC`);
  return {
    desde: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    hasta: new Date().toISOString(),
    consumo_por_insumo: rows.map((row) => ({ ...row,
      insumo_id: Number(row.insumo_id), stock_actual: Number(row.stock_actual),
      stock_minimo: Number(row.stock_minimo), consumo_7_dias: Number(row.consumo_7_dias),
    })),
  };
}
