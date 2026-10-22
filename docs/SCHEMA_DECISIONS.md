# Decisiones del esquema — Raíz & Madera

- `pedido_items.pedido_id → pedidos.id ON DELETE CASCADE`: al borrar un pedido de prueba se limpiarían sus líneas, aunque la API no expone DELETE para pedidos y el historial operativo se conserva mediante anulación.
- `pedido_items.producto_id → productos.id ON DELETE RESTRICT`: protege el historial; no se permite borrar un producto vendido.
- `app_users.email UNIQUE`: evita cuentas duplicadas; el servicio normaliza correo a minúsculas antes de persistir.
- `app_users.role CHECK`: restringe roles a `admin`, `encargado` y `caja`.
- `productos.categoria CHECK`: solo acepta `plantas`, `muebles` o `decoracion`, igual que el formulario y Zod.
- `productos.precio > 0`: una unidad a la venta debe tener precio positivo.
- `productos.stock >= 0` y `stock_minimo >= 0`: el inventario nunca acepta unidades negativas y el punto de reposición no puede ser negativo.
- `pedidos.metodo_pago CHECK`: se limita a `efectivo`, `tarjeta`, `sinpe_movil`.
- `pedidos.estado CHECK`: se limita a `pendiente`, `confirmado`, `anulado`.
- `CHECK (estado <> 'confirmado' OR fecha_confirmacion IS NOT NULL)`: toda venta confirmada tiene el instante desde el que se computan los 15 minutos.
- `CHECK (total = subtotal + impuesto)`: conserva coherencia aritmética entre total e importes.
- `pedido_items.cantidad > 0`: una línea de venta siempre contiene una cantidad positiva.
- `pedido_items.precio_unitario > 0`: conserva el precio no negativo histórico por unidad.
- `DECIMAL(12,2)` para dinero: mantiene dos decimales sin aritmética monetaria binaria en MySQL 8.4.
- `INTEGER` para stock: plantas en maceta, muebles y piezas de decoración se cuentan por unidad vendible en este modelo.

Los índices soportan filtros por nombre/categoría/activo, alertas de stock y agregaciones de ventas por fecha/estado/método. Para vender productos por peso/volumen habría que ampliar el modelo de unidades y precisión antes de cargar esos artículos.


### Cuentas con Google

`app_users.google_sub` guarda el identificador estable de la cuenta Google y tiene un índice único parcial (solo cuando no es NULL). `password_hash` permite NULL exclusivamente para cuentas que usan Google OAuth; la autenticación local continúa verificando bcrypt y una cuenta OAuth no recibe contraseña por defecto. La migración `002_google_oauth.sql` adapta bases que ya existían.
