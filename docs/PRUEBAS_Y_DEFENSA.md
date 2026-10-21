# Pruebas, demo y defensa

## Checklist mínimo

- [ ] `psql -d grano_hoja -f schema.sql` finaliza sin errores.
- [ ] GET productos e insumos devuelve arrays y estados de disponibilidad/bajo mínimo.
- [ ] POST inválido devuelve 400 y `{ "error": "..." }`.
- [ ] GET id inexistente devuelve 404.
- [ ] Borrar insumo referido por receta devuelve 409.
- [ ] Crear producto con receta y editar producto/receta funciona; duplicados y datos inválidos se rechazan.
- [ ] Pedido válido: pendiente → confirmado, stock baja por la suma de todos los items.
- [ ] Pedido con insumo insuficiente: confirmar devuelve 409 y ningún insumo cambia.
- [ ] Confirmar dos veces devuelve 409.
- [ ] Anular confirmado antes de 15 minutos repone insumos; anular tras 16 minutos devuelve 409.
- [ ] Dos pedidos concurrentes por el mismo stock no lo dejan negativo.
- [ ] `/api/resumen` solo cuenta pedidos confirmados, por método de pago y top cinco productos.
- [ ] `/api/reportes/ventas-semana` y `/api/insumos/bajo-minimo` funcionan.
- [ ] Vite puede leer datos de la API sin error CORS; probar loading/error/empty.
- [ ] Agente n8n responde `{ ok, data, error }` y las sugerencias mencionan stock/mínimo/consumo.

## Ejemplos curl

Crear pedido (ajusta ids a datos reales):

```bash
curl -i -X POST http://localhost:3001/api/pedidos \
  -H 'Content-Type: application/json' \
  -d '{"metodo_pago":"efectivo","items":[{"producto_id":3,"cantidad":2}]}'
```

Confirmar:

```bash
curl -i -X POST http://localhost:3001/api/pedidos/16/confirmar
```

Anular:

```bash
curl -i -X POST http://localhost:3001/api/pedidos/16/anular
```

Forzar el caso de anulación vencida (solo en datos locales de prueba): primero identifica un pedido confirmado y cambia su timestamp, sin cambiar su estado. Luego el POST debe devolver `409`.

```sql
UPDATE pedidos
SET fecha_confirmacion = NOW() - INTERVAL '16 minutes'
WHERE id = 12 AND estado = 'confirmado';
```

```bash
curl -i -X POST http://localhost:3001/api/pedidos/12/anular
```

Prueba de validación 400:

```bash
curl -i -X POST http://localhost:3001/api/insumos \
  -H 'Content-Type: application/json' \
  -d '{"nombre":"","unidad":"g","stock":-2,"stock_minimo":0}'
```

## Demo individual (~5 minutos)

1. Abrir panel y explicar ventas por método y top cinco.
2. Buscar un producto por texto, filtrar categoría y ordenar precio.
3. Crear/editar un insumo o producto con receta; mostrar validación.
4. Crear un pedido válido, confirmar y mostrar que el stock cambia.
5. Crear un pedido de frappé en cantidad mayor que el inventario, confirmar y mostrar 409.
6. Mostrar pedido, plazo de anulación y agente que justifica reposición con datos de la API.

## 10 preguntas probables

1. **¿Por qué hay una capa services?** Para mantener reglas y SQL fuera de los controladores.
2. **¿Por qué una transacción?** Si falla el descuento de un insumo, se revierte todo para no dejar stock parcialmente descontado.
3. **¿Qué hace FOR UPDATE?** Bloquea las filas seleccionadas hasta terminar la transacción, de modo que dos ventas no gasten simultáneamente el mismo saldo.
4. **¿Por qué agrupar insumos de todos los items?** Dos productos pueden usar café/leche compartidos; la necesidad real es la suma de todos.
5. **¿Por qué guardar precio_unitario?** Para que los pedidos históricos no cambien si cambia el menú.
6. **¿Cómo se calcula impuesto?** Subtotal sumando precio histórico por cantidad, impuesto de 13% redondeado a dos decimales y total subtotal+impuesto.
7. **¿Cuándo se permiten anulaciones?** Hasta 15 minutos desde `fecha_confirmacion`.
8. **¿Por qué 409 y no 400 para stock insuficiente?** La petición está bien formada, pero choca con el estado del inventario.
9. **¿Qué hace useFetch?** Centraliza carga, error, datos, refetch y aborta una petición obsoleta al desmontar.
10. **¿Cómo evita React ser la fuente de verdad?** Solo orienta con la disponibilidad; el servidor vuelve a validar bajo bloqueo antes de descontar.

## Tres modificaciones en vivo posibles

- Añadir una categoría: revisar datos, filtro de React y lista aceptada por la validación si la categoría estuviera limitada.
- Cambiar impuesto del 13%: hacerlo en un servicio central del backend y ajustar las pruebas; no solo cambiar el texto del front.
- Añadir una tarjeta de métrica: reutilizar `MetricCard`, añadir el dato al servicio `/api/resumen` y presentar estados loading/error/empty.
