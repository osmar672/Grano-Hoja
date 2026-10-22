# Pruebas — Grano & Hoja

## Verificaciones locales de código

Ejecuta desde la carpeta principal:

```powershell
node --version
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

Cada paquete se instala desde su carpeta con `npm install --no-fund --no-audit`, de acuerdo con `.github/workflows/security.yml`. No se configura un workspace npm en el nivel superior. En esta auditoría el registro `registry.npmjs.org` no resolvió por DNS, por lo que la instalación limpia, el audit online y el build final no pueden darse por verificados.

## Pruebas unitarias de consumo

`backend/tests/consumo-insumos.test.js` cubre cálculo puro sin base de datos: suma un insumo compartido entre líneas/productos, cantidades decimales, productos sin receta, stock insuficiente con error 409 e insumos inactivos. La suite completa disponible pasó 39 pruebas en el entorno de auditoría.

## Prueba manual con MySQL real (pendiente)

No se debe declarar correcto el comportamiento transaccional hasta ejecutar el siguiente procedimiento contra MySQL 8.0.16+ (recomendado MySQL 8.4, InnoDB y `utf8mb4`). No se pudo ejecutar en el entorno de auditoría porque no había cliente/servidor MySQL instalado.

1. Haz un backup y confirma que se puede restaurar.
2. Comprueba que la base ya tenga aplicadas las migraciones anteriores que crean `productos`, `pedidos` y las tablas de sesión. La migración 004 no reemplaza las migraciones 001–003.
3. Abre PowerShell, carga las variables `DB_HOST`, `DB_USER`, `DB_NAME` del entorno de prueba y ejecuta el cliente de MySQL sin poner la contraseña en el comando. Desde PowerShell nativo usa la invocación siguiente para que la redirección de archivo la gestione `cmd.exe` (la contraseña se solicita de forma interactiva por el cliente):

   ```powershell
   $cmd = "mysql --host=$env:DB_HOST --user=$env:DB_USER --password --database=$env:DB_NAME < backend\migrations\004_insumos_recetas.sql"
   cmd.exe /d /s /c $cmd
   ```

   Revisa la salida del cliente y el código de salida. Si tu `cmd.exe` no permite que el cliente solicite la contraseña de forma interactiva al redirigir stdin, configura previamente un login-path local mediante `mysql_config_editor` y sustituye `--user/--password` por ese login-path. Nunca añadas la contraseña literal al comando o al historial.
4. Inicia backend/frontend y usa un usuario `admin` o `encargado`.
5. Crea, por ejemplo, un insumo de café (`g`, stock 100.000) y leche (`ml`, stock 500.000). Crea/edita productos espresso (18 g de café) y cappuccino (18 g café + 120 ml leche).
6. Crea un pedido con un espresso y un cappuccino, confirma y comprueba que se consuman exactamente 36 g café y 120 ml leche y que se guarden movimientos.
7. Repite la confirmación: debe responder 409 y no volver a descontar.
8. Crea un pedido cuyo consumo de leche supere el stock: debe responder 409 y dejar pedido/stock sin cambios parciales.
9. Anula una venta confirmada dentro de los 15 minutos: debe restituir los movimientos originales. Repetir anulación debe fallar y no aumentar stock de nuevo.
10. Cambia la receta después de confirmar una venta y anúlala: debe restituir las cantidades consumidas originalmente, no la receta nueva.
11. Prueba dos pedidos concurrentes que disputan un stock limitado: no debe haber stock negativo ni más consumo que disponibilidad.
12. Verifica con sesión válida o token de servicio `GET /api/insumos/bajo-minimo`, `GET /api/reportes/ventas-semana` y `GET /api/reportes/consumo-insumos-semana`.

## Contratos HTTP

- `GET /api/insumos`: devuelve `id`, `nombre`, `unidad`, `stock` (alias frontend), `stock_actual`, `stock_minimo`, `activo` y `bajo_minimo`.
- `POST /api/insumos`: `nombre`, `unidad`, `stock` o `stock_actual`, `stock_minimo`, `activo` opcional. Duplicado: 409; cantidad negativa o con más de tres decimales: 400.
- `GET /api/productos/:id/receta`: `{ producto_id, producto, items }`.
- `PUT /api/productos/:id/receta`: `{ "items": [{ "insumo_id": 1, "cantidad": 18 }] }`. `items: []` quita receta; solo admin/encargado puede reemplazarla.
- `POST /api/pedidos/:id/confirmar`: devuelve 409 en stock insuficiente y debe revertir toda la transacción.
- `POST /api/pedidos/:id/anular`: una venta confirmada solo puede anularse durante los primeros 15 minutos, restituye movimientos registrados y no permite restituir dos veces.
- `GET /api/reportes/consumo-insumos-semana`: consumo realmente registrado en movimientos de pedidos confirmados durante los últimos siete días.

Los productos sin receta se pueden vender, pero no descuentan insumos ni el stock legado del producto. Para controlar el consumo de un producto real, asígnale receta antes de operar.

## HTTP smoke y Postman

`smoke.http` contiene solicitudes de ejemplo. Cambia IDs por registros existentes y no ejecutes las solicitudes de limpieza/edición en una base productiva. Importa `Grano-Hoja.postman_collection.json` para el flujo principal y `Grano-Hoja-seguridad.postman_collection.json` para roles. Mantén las contraseñas únicamente en variables locales de Postman.
