import { pool } from '../db.js';
import { AppError } from '../utils/AppError.js';

export async function obtenerResumen(fechaSolicitada) {
  if (fechaSolicitada) {
    const validShape = /^\d{4}-\d{2}-\d{2}$/.test(fechaSolicitada);
    const parsed = new Date(`${fechaSolicitada}T00:00:00.000Z`);
    if (!validShape || Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== fechaSolicitada) {
      throw new AppError(400, 'fecha debe ser una fecha válida con formato YYYY-MM-DD');
    }
  }
  const fecha = fechaSolicitada || null;
  const { rows: pagos } = await pool.query(`SELECT metodo_pago, COUNT(*)::int AS cantidad_pedidos, ROUND(SUM(total),2)::numeric(12,2) AS total
    FROM pedidos WHERE estado='confirmado'
      AND (fecha_confirmacion AT TIME ZONE 'America/Costa_Rica')::date = COALESCE($1::date, (NOW() AT TIME ZONE 'America/Costa_Rica')::date)
    GROUP BY metodo_pago ORDER BY metodo_pago`, [fecha]);
  const { rows: totalRows } = await pool.query(`SELECT COUNT(*)::int AS cantidad_pedidos, COALESCE(ROUND(SUM(total),2),0)::numeric(12,2) AS total_general
    FROM pedidos WHERE estado='confirmado'
      AND (fecha_confirmacion AT TIME ZONE 'America/Costa_Rica')::date = COALESCE($1::date, (NOW() AT TIME ZONE 'America/Costa_Rica')::date)`, [fecha]);
  const { rows: top } = await pool.query(`SELECT pr.id AS producto_id, pr.nombre, SUM(pi.cantidad)::int AS unidades_vendidas,
      ROUND(SUM(pi.cantidad * pi.precio_unitario),2)::numeric(12,2) AS total_vendido
    FROM pedidos pe JOIN pedido_items pi ON pi.pedido_id=pe.id JOIN productos pr ON pr.id=pi.producto_id
    WHERE pe.estado='confirmado' AND (pe.fecha_confirmacion AT TIME ZONE 'America/Costa_Rica')::date = COALESCE($1::date, (NOW() AT TIME ZONE 'America/Costa_Rica')::date)
    GROUP BY pr.id, pr.nombre ORDER BY unidades_vendidas DESC, pr.nombre ASC LIMIT 5`, [fecha]);
  const { rows: dateRows } = await pool.query("SELECT COALESCE($1::date, (NOW() AT TIME ZONE 'America/Costa_Rica')::date)::text AS fecha", [fecha]);
  return { fecha: dateRows[0].fecha, ...totalRows[0], por_metodo_pago: pagos, productos_mas_vendidos: top };
}
