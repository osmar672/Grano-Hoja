import { pool } from '../db.js';

export async function obtenerVentasSemana() {
  const { rows: ventas } = await pool.query(`SELECT pr.id AS producto_id, pr.nombre AS producto, SUM(pi.cantidad)::int AS unidades_vendidas,
      ROUND(SUM(pi.cantidad * pi.precio_unitario),2)::numeric(12,2) AS total_vendido
    FROM pedidos pe JOIN pedido_items pi ON pi.pedido_id=pe.id JOIN productos pr ON pr.id=pi.producto_id
    WHERE pe.estado='confirmado' AND pe.fecha_confirmacion >= NOW() - INTERVAL '7 days'
    GROUP BY pr.id, pr.nombre ORDER BY unidades_vendidas DESC, pr.nombre`);
  const { rows: consumo } = await pool.query(`SELECT i.id AS insumo_id, i.nombre AS insumo, i.unidad,
      ROUND(SUM(r.cantidad * pi.cantidad),3)::numeric(12,3) AS consumo_estimado_7_dias,
      i.stock, i.stock_minimo
    FROM pedidos pe JOIN pedido_items pi ON pi.pedido_id=pe.id JOIN recetas r ON r.producto_id=pi.producto_id JOIN insumos i ON i.id=r.insumo_id
    WHERE pe.estado='confirmado' AND pe.fecha_confirmacion >= NOW() - INTERVAL '7 days'
    GROUP BY i.id, i.nombre, i.unidad, i.stock, i.stock_minimo ORDER BY consumo_estimado_7_dias DESC, i.nombre`);
  return { desde: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(), hasta: new Date().toISOString(), ventas_por_producto: ventas, consumo_estimado_insumos: consumo };
}
