import { pool } from '../db.js';

export async function obtenerProductosBajoStock() {
  const { rows } = await pool.query(`SELECT id,nombre,categoria,stock,stock_minimo,(stock_minimo-stock) AS faltante_minimo
    FROM productos WHERE activo=TRUE AND stock<stock_minimo ORDER BY (stock_minimo-stock) DESC,nombre ASC`);
  return rows;
}

export async function obtenerVentasSemana() {
  const { rows } = await pool.query(`SELECT p.id AS producto_id,p.nombre AS producto,p.categoria,p.stock,p.stock_minimo,
      COALESCE(SUM(CASE WHEN pe.id IS NOT NULL THEN pi.cantidad ELSE 0 END),0) AS unidades_vendidas_7_dias,
      COALESCE(ROUND(SUM(CASE WHEN pe.id IS NOT NULL THEN pi.cantidad*pi.precio_unitario ELSE 0 END),2),0) AS total_vendido,
      GREATEST(p.stock_minimo-p.stock, CEIL(COALESCE(SUM(CASE WHEN pe.id IS NOT NULL THEN pi.cantidad ELSE 0 END),0)/7*14-p.stock),0) AS cantidad_sugerida
    FROM productos p
    LEFT JOIN pedido_items pi ON pi.producto_id=p.id
    LEFT JOIN pedidos pe ON pe.id=pi.pedido_id AND pe.estado='confirmado' AND pe.fecha_confirmacion>=DATE_SUB(UTC_TIMESTAMP(3),INTERVAL 7 DAY)
    WHERE p.activo=TRUE GROUP BY p.id,p.nombre,p.categoria,p.stock,p.stock_minimo
    ORDER BY unidades_vendidas_7_dias DESC,p.nombre ASC`);
  return { desde: new Date(Date.now()-7*24*60*60*1000).toISOString(), hasta: new Date().toISOString(), ventas_por_producto: rows };
}
