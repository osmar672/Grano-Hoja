# Arquitectura y decisiones — Grano & Hoja

## Capas

- **Rutas:** enlazan método HTTP y controlador.
- **Controladores:** extraen parámetros y envían JSON; delegan reglas al servicio.
- **Servicios:** validan reglas de negocio, ejecutan SQL y transacciones.
- **Pool PostgreSQL:** en `backend/src/db.js`; las consultas usan placeholders `$1`, `$2`, etc.
- **React:** cada vista consume `services/api.js`; solo el servicio de n8n llama a la URL del webhook.

## Modelo de datos

`productos` y `insumos` se relacionan mediante `recetas` (muchos a muchos). `pedidos` contiene `pedido_items`; cada item conserva `precio_unitario` como histórico.

## Decisiones

- Transiciones válidas: `pendiente → confirmado`, `pendiente → anulado` (sin movimiento de stock) y `confirmado → anulado` solo dentro de 15 minutos. Confirmar otra vez o anular dos veces produce 409.
- `fecha_confirmacion TIMESTAMPTZ` fija el inicio real de la ventana de anulación.
- `NUMERIC(12,2)` para dinero y `NUMERIC(12,3)` para stock/cantidad de receta.
- Stock usado en varias líneas se agrupa con `SUM(recetas.cantidad * pedido_items.cantidad)` antes de validar.
- `SELECT ... FOR UPDATE` bloquea las filas de insumos por id creciente durante la confirmación/anulación, evitando carreras por el stock de la misma fila y reduciendo el riesgo de bloqueo mutuo.
- El resumen filtra pedidos `confirmado` y agrupa por fecha de confirmación en `America/Costa_Rica`.
- No se implementan combos; quedan fuera del alcance solicitado.

## Nota sobre restauración exacta de recetas

El esquema del caso tiene cinco tablas y no añade un libro de movimientos. Por eso, la API impide cambiar una receta cuando su producto tiene un pedido confirmado dentro de la ventana de 15 minutos. Así la anulación devuelve la misma cantidad de insumos que se descontó mientras la anulación todavía está permitida. La implementación educativa no pretende reemplazar una auditoría contable de inventario.
