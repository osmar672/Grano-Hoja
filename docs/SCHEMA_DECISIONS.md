# Decisiones del esquema — Grano & Hoja

- Motor oficial: MySQL 8/InnoDB/utf8mb4. Las consultas usan placeholders `?`, tipos `DECIMAL` para cantidades/dinero y restricciones `CHECK`/foreign keys de MySQL.
- `productos` contiene catálogo y precio histórico capturado por línea de pedido. El campo antiguo `productos.stock` se conserva por compatibilidad con instalaciones anteriores, pero ya no controla el consumo de ingredientes.
- `insumos` es la fuente de inventario de ingredientes: nombre único, unidad, stock y mínimo decimal no negativo, estado activo y timestamps.
- `recetas` relaciona producto e insumo con cantidad decimal positiva por cada unidad de producto; `UNIQUE(producto_id, insumo_id)` impide líneas duplicadas del mismo insumo en la receta.
- `movimientos_inventario` mantiene los tipos `consumo`, `restitucion` y `ajuste` en cantidades positivas. Consumo y restitución referencian pedido cuando proceda; se conserva historial para auditoría.
- `pedido_items.pedido_id → pedidos.id` y `pedido_items.producto_id → productos.id` mantienen líneas históricas. La API no ofrece DELETE para pedidos; se anulan mediante transición de estado.
- `recetas.producto_id → productos.id ON DELETE CASCADE`; `recetas.insumo_id → insumos.id ON DELETE RESTRICT` para no borrar ingredientes en uso.
- `movimientos_inventario.insumo_id` y `pedido_id` usan foreign keys restrictivas; preservar referencias de auditoría es prioritario.
- `app_users.email` es único; `google_sub` identifica la cuenta Google, y las cuentas OAuth pueden no tener `password_hash`.
- Roles válidos: `admin`, `encargado`, `caja`. Métodos de pago: `efectivo`, `tarjeta`, `sinpe_movil`. Estados de pedido: `pendiente`, `confirmado`, `anulado`.
- Categorías nuevas de producto: `bebidas_calientes`, `bebidas_frias`, `reposteria`, `comida`. Se aceptan temporalmente `plantas`, `muebles`, `decoracion` para no invalidar datos preexistentes; elimina esas categorías solo mediante una futura migración de datos aprobada.
- `DECIMAL(12,3)` se usa en existencias y recetas para gramos, mililitros y fracciones de unidad. Importes monetarios usan `DECIMAL(12,2)`; cantidad de producto vendido es entero positivo.
- La confirmación de pedido bloquea insumos en orden de ID, vuelve a comprobar stock dentro de una sola transacción y registra movimientos. Si falta stock, `ROLLBACK` evita descuentos parciales.
- La anulación confirmada conserva el plazo funcional de 15 minutos y se basa en los movimientos originales, no en la receta actual. Se limita a una sola restitución por pedido/insumo/tipo.

## Aplicación de esquemas

`schema.sql` es solo para bases de demostración descartables: incluye `DROP TABLE` y datos semilla. `schema.production.sql` inicializa una base nueva sin datos demo ni `DROP`. Para una base existente, crear backup y aplicar migraciones aditivas en orden. La migración `backend/migrations/004_insumos_recetas.sql` requiere que las tablas de base y la constraint `productos_category_allowed` estén presentes como en las versiones del proyecto; no ha sido probada contra MySQL real durante esta auditoría.
