# Pruebas y defensa — Grano & Hoja

## Pruebas automáticas

Desde la carpeta principal:

```powershell
node scripts/check-vercel.mjs
node scripts/check-integration.mjs
Push-Location backend
npm run check
npm run check:integration
npm test
npm audit --audit-level=moderate
Pop-Location
Push-Location frontend
npm audit --audit-level=moderate
$env:VITE_API_URL = '/api'
npm run build
Pop-Location
```

Estas pruebas de instalación/audit/build se deben ejecutar tras una instalación npm limpia. En la sesión de auditoría, la suite backend pasó 39/39, `check` validó 52 archivos, integración pasó 31/31 y Vercel pasó 20/20. `npm audit` y el build limpio siguen sin verificar porque el registro de npm no era resoluble por DNS; no se reporta un audit limpio.

## Casos funcionales con MySQL real

- `schema.sql` solo sobre una base desechable, porque contiene `DROP TABLE`.
- Insumos: listar, crear, editar, archivar/eliminar conforme a relaciones, stock decimal y mínimo.
- Recetas: leer y reemplazar; la combinación producto/insumo es única; no debe agregarse insumo inactivo.
- Ventas: crear pendiente; confirmar con inventario suficiente; confirmar con stock insuficiente y comprobar `409` sin modificación parcial; confirmar dos veces y comprobar `409`.
- Consumo acumulado: dos líneas/productos con café compartido deben sumar por insumo.
- Concurrencia: dos pedidos disputan el mismo stock, no debe haber stock negativo.
- Anulación: pedido pendiente anulado sin devolución; pedido confirmado anulado dentro de 15 minutos restituye los movimientos; anulación repetida o fuera de plazo da `409`.
- Producto sin receta: vendible sin descuento de ingredientes ni de `productos.stock` legado. Configura recetas para todos los productos cuyo consumo deba registrarse.
- n8n y OAuth: probarlos solamente con las credenciales e instancias reales del propietario.

Los pasos SQL y los contratos exactos están en `tests/README.md` y `tests/smoke.http`. La migración 004, locks, concurrencia y datos reales no se ejecutaron en MySQL en esta sesión.

## Postman

Importa `tests/Grano-Hoja.postman_collection.json` para el flujo principal e `tests/Grano-Hoja-seguridad.postman_collection.json` para roles y seguridad. Define las contraseñas como variables locales de Postman; nunca las guardes en la colección ni en Git.

## Preguntas de defensa

- **¿Por qué una transacción?** Se actualizan varias filas de insumos, movimientos y estado de venta; si cualquier validación falla, todo debe revertirse.
- **¿Cómo evita stock negativo?** Bloquea las filas de inventario por ID, comprueba stock bajo bloqueo y ejecuta actualizaciones condicionales dentro de una transacción.
- **¿Qué ocurre si cambia una receta?** La anulación usa el consumo original registrado; no recalcula la cantidad a partir de la receta actual.
- **¿Cuándo se puede anular?** Solo en los 15 minutos posteriores a confirmar; el plazo se basa en `fecha_confirmacion`.
- **¿Dónde se aplican permisos?** En las rutas Express además de ocultar enlaces en React; una llamada HTTP directa sigue sujeta a middleware backend.
- **¿Qué permisos tiene n8n?** El flujo oficial consulta insumos mínimos y reportes de lectura; no escribe directamente a MySQL ni tiene por defecto permiso para descontar stock.

## Estado de evidencia

La sintaxis, los tests unitarios y los checks estáticos indicados arriba sí se ejecutaron con los módulos ya presentes. El build de producción con dependencias declaradas, `npm audit` sin red, migración/transacciones MySQL real, autenticación Google, instancia Vercel y ejecución del workflow n8n permanecen sin verificar; no se deben presentar como pruebas exitosas.
