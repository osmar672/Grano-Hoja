# Backend — Grano & Hoja

API REST de punto de venta e inventario de cafetería, implementada en Node.js con Express ES modules y MySQL (`mysql2/promise`). La API utiliza Zod para validar entradas, sesiones en MySQL, bcrypt, roles, CSRF, Helmet y límites de intentos.

## Estructura

- `src/routes/`: rutas HTTP de autenticación, administración, productos, insumos, pedidos, reportes y agente.
- `src/controllers/`: adaptación entre HTTP y servicios.
- `src/services/`: reglas de negocio y consultas; `consumo-insumos.js` es la función pura para calcular consumo desde recetas.
- `src/middleware/`: autenticación, autorización, validación, CSRF, errores y logging.
- `src/db.js`: pool MySQL y transacciones.
- `migrations/004_insumos_recetas.sql`: creación aditiva de insumos, recetas y movimientos, prevista para esquema MySQL existente que ya haya aplicado la estructura previa.
- `tests/`: pruebas Node `node:test`.

## Contratos principales

- `/api/productos`: catálogo; `/api/productos/:id/receta` consulta y reemplaza la receta.
- `/api/insumos`: CRUD protegido por rol; `GET /api/insumos/bajo-minimo` permite usuarios autorizados y el token de servicio para n8n.
- `/api/pedidos`: crear pedido pendiente, confirmar o anular. Confirmar valida recetas y stock de todos los insumos en una transacción y registra movimientos. Producto sin receta se vende sin descuento de ingredientes ni del stock legado de producto.
- `/api/reportes/consumo-insumos-semana`: consumo de movimientos de pedidos confirmados en los últimos siete días.
- `/api/agente/sugerencia-compra`: reenvía la solicitud al webhook configurado de n8n tras comprobar sesión/rol.

## Comandos

Ejecutar desde esta carpeta:

```powershell
npm install --no-fund --no-audit
npm run check
npm run check:integration
npm test
npm audit --audit-level=moderate
npm run dev
```

`npm install` puede actualizar `package-lock.json` conforme al `package.json`; en la auditoría no pudo regenerarse de forma limpia porque el entorno no resolvía `registry.npmjs.org`. No se afirma que el audit o la instalación limpia estén validados hasta ejecutarlos con conectividad.

## Configuración

Copia `.env.example` a `.env` y completa los valores localmente. No subas ni compartas `.env`. En producción revisa `.env.production.example`; en Vercel revisa `.env.vercel.example`. `scripts/check-production-env.mjs` valida una configuración de archivo sin imprimir los valores secretos.

## Base de datos

El motor oficial es MySQL 8 con InnoDB y `utf8mb4`. `../schema.sql` es el esquema de desarrollo y contiene `DROP TABLE` más datos demo; no ejecutarlo sobre una base con datos que deban conservarse. `../schema.production.sql` es el esquema de nueva instalación. Para una base existente, realiza respaldo y aplica las migraciones aditivas apropiadas; no cambies a PostgreSQL ni esperes que editar `DB_NAME` migre datos.

## Estado de verificación

En los módulos disponibles, `npm run check` verificó la sintaxis de 52 archivos y `npm test` pasó 39 pruebas unitarias. No se verificó la migración ni las transacciones contra servidor MySQL real en el entorno de auditoría. Véase `../tests/README.md` para un smoke test reproducible.
