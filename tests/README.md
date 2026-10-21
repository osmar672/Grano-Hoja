# Pruebas de aceptación — Grano & Hoja

La rúbrica pide evidencia reproducible de los endpoints y casos de error. En esta versión solo se define el plan; aquí se añadirá la colección importable de Postman/Thunder Client o, como mínimo, una tabla de método, URL, body y resultado esperado cuando la API esté implementada.

## Casos obligatorios del backend

- CRUD de insumos y productos: éxito, datos inválidos, ID inexistente y conflicto de integridad cuando aplique.
- Crear pedido con cantidades positivas y comprobar subtotal, impuesto del 13 %, total y precio histórico de cada línea.
- Confirmar pedido válido: stock disminuye una sola vez y estado cambia a `confirmado`.
- Confirmar dos veces: segunda transición se rechaza con `409`.
- Pedido que requiere más stock del disponible: `409` y ningún stock cambia.
- Anulación dentro de 15 minutos: `anulado` y stock devuelto en transacción.
- Anulación después de 15 minutos (prueba con fecha de confirmación controlada): `409`.
- Dos pedidos concurrentes que compiten por el mismo insumo: no dejar stock negativo ni confirmar ambos si el inventario no alcanza.
- Resumen diario por fecha y ventas semanales; pedidos anulados no cuentan.
- Agente n8n: éxito, API no disponible, entrada inválida y contrato `{ ok, data, error }` siempre consistente.

Cada caso debe indicar precondiciones, petición, respuesta HTTP, cambios esperados en la base de datos y el resultado real observado.
