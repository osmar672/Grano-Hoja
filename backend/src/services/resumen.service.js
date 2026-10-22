import { pool } from '../db.js';
import { costaRicaDayBounds } from '../utils/costaRicaDate.js';

export async function obtenerResumen(fechaSolicitada) {
  const { fecha, start, end } = costaRicaDayBounds(fechaSolicitada || undefined);
  const params = [start, end];
  const { rows: pagos } = await pool.query(`SELECT metodo_pago,COUNT(*) AS cantidad_pedidos,ROUND(SUM(total),2) AS total
    FROM pedidos WHERE estado='confirmado' AND fecha_confirmacion>=? AND fecha_confirmacion<?
    GROUP BY metodo_pago ORDER BY metodo_pago`, params);
  const { rows: totalRows } = await pool.query(`SELECT COUNT(*) AS cantidad_pedidos,COALESCE(ROUND(SUM(total),2),0) AS total_general
    FROM pedidos WHERE estado='confirmado' AND fecha_confirmacion>=? AND fecha_confirmacion<?`, params);
  const { rows: top } = await pool.query(`SELECT pr.id AS producto_id,pr.nombre,SUM(pi.cantidad) AS unidades_vendidas,
      ROUND(SUM(pi.cantidad*pi.precio_unitario),2) AS total_vendido
    FROM pedidos pe JOIN pedido_items pi ON pi.pedido_id=pe.id JOIN productos pr ON pr.id=pi.producto_id
    WHERE pe.estado='confirmado' AND pe.fecha_confirmacion>=? AND pe.fecha_confirmacion<?
    GROUP BY pr.id,pr.nombre ORDER BY unidades_vendidas DESC,pr.nombre ASC LIMIT 5`, params);
  return { fecha, ...totalRows[0], por_metodo_pago: pagos, productos_mas_vendidos: top };
}
