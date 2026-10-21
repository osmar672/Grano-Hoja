# Justificación de claves foráneas y CHECK

## Claves foráneas

- `recetas.producto_id → productos.id ON DELETE CASCADE`: si un producto no tiene historial de ventas y se elimina, su receta deja de tener sentido y se limpia en cascada.
- `recetas.insumo_id → insumos.id ON DELETE RESTRICT`: no permite borrar un insumo que se necesita para preparar un producto.
- `pedido_items.pedido_id → pedidos.id ON DELETE CASCADE`: la línea no puede existir sin su pedido; el API no expone borrar pedidos, así que se limita a mantenimiento/reset de datos.
- `pedido_items.producto_id → productos.id ON DELETE RESTRICT`: preserva el nombre/relación histórica de una venta; se impide borrar el producto vendido.

## CHECK y restricciones únicas

- `insumos.unidad` no vacía: cada stock necesita una unidad que se pueda mostrar y calcular.
- `insumos.stock >= 0`: una operación nunca puede dejar inventario negativo.
- `insumos.stock_minimo >= 0`: el punto de reposición no puede ser negativo.
- `productos.precio > 0`: impide crear productos gratuitos o con precio negativo en este caso.
- `productos.categoria` no vacía: permite filtrar el menú de manera consistente.
- `recetas.cantidad > 0`: cada receta tiene que consumir una cantidad positiva del insumo.
- `UNIQUE(recetas.producto_id, recetas.insumo_id)`: un insumo solo aparece una vez por receta; si la receta lo necesita varias veces, las cantidades se suman antes de guardar.
- `pedidos.metodo_pago IN (...)`: limita los medios de pago al catálogo definido por el negocio.
- `pedidos.estado IN (...)`: evita estados no reconocidos fuera del flujo de pedido.
- `pedidos.subtotal/impuesto/total >= 0`: los importes monetarios no deben ser negativos.
- `estado <> 'confirmado' OR fecha_confirmacion IS NOT NULL`: un pedido confirmado debe tener la hora desde la que corre el plazo de anulación.
- `pedido_items.cantidad > 0`: un item de pedido debe vender al menos una unidad.
- `pedido_items.precio_unitario > 0`: se conserva un precio histórico válido en cada línea.
- `UNIQUE` de nombres en insumos/productos: reduce duplicados accidentales en catálogos básicos.

## Índices

- Categoría/activo de productos: acelera el menú filtrado.
- Insumo de receta: permite consultar productos que dependen de un insumo.
- Fecha de confirmación/estado y método/estado de pedidos: ayudan al resumen diario y los reportes.
- IDs de pedido/producto en líneas: aceleran el detalle y agregados de ventas.
