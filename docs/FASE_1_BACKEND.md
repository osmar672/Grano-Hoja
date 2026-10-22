# Backend actual — Grano & Hoja

Este documento describe la implementación que existe hoy; ya no es una propuesta PostgreSQL ni un plan de una fase futura.

## Stack y persistencia

Node.js (ES modules), Express, `mysql2/promise`, MySQL 8/InnoDB/utf8mb4, `express-session` respaldado por MySQL, Zod, bcrypt, Helmet y middleware de roles/CSRF. Las consultas usan placeholders MySQL `?`; el acceso a datos no convierte placeholders PostgreSQL.

## API montada

| Prefijo | Función |
|---|---|
| `/api/health`, `/api/ready` | Salud de proceso y disponibilidad de base de datos. |
| `/api/auth` | Login, logout, sesión actual y Google OAuth. |
| `/api/admin` | Administración protegida de usuarios y auditoría. |
| `/api/productos` | CRUD de catálogo y `GET/PUT /:id/receta`. |
| `/api/insumos` | CRUD de insumos y `GET /bajo-minimo`. |
| `/api/pedidos` | Crear/listar pedidos, confirmar y anular. |
| `/api/resumen` | Cierre del día. |
| `/api/reportes` | Reportes de ventas e inventario/consumo. |
| `/api/agente` | Integración protegida con el workflow oficial de n8n. |

Los métodos, roles y esquemas se definen en `backend/src/routes/`, los contratos de validación en `backend/src/validation/schemas.js` y la lógica en `backend/src/services/`.

## Venta, inventario y receta

Los pedidos se crean en estado `pendiente`. Confirmar consume recetas dentro de una transacción: agrupa insumos repetidos entre líneas, ordena por ID, toma `SELECT ... FOR UPDATE`, valida stock suficiente, descuenta stock y registra `movimientos_inventario`. Un faltante revierte la transacción y devuelve `409` con el nombre del insumo. Una receta vacía es válida, por lo que ese producto no consume ingredientes. Un pedido confirmado puede anularse dentro de 15 minutos; se restituyen los movimientos originales una sola vez.

## Esquemas y migración

- `../schema.sql`: solo para base de demostración descartable; incluye `DROP TABLE` y seeds.
- `../schema.production.sql`: estructura inicial sin datos demo, no contiene instrucciones `DROP`.
- `migrations/004_insumos_recetas.sql`: crea las tablas `insumos`, `recetas` y `movimientos_inventario`, y actualiza el CHECK de categorías manteniendo los valores antiguos. No elimina filas; requiere las tablas/constraint previas.

La migración no se ejecutó contra un MySQL real durante esta auditoría. Aplicarla después de respaldo y con las migraciones previas en el estado esperado; instrucciones en `../tests/README.md`.

## Pruebas

Ejecuta desde `backend/`:

```powershell
npm run check
npm run check:integration
npm test
npm audit --audit-level=moderate
```

En los módulos que venían incluidos, `check` verificó sintaxis en 52 archivos y 39 pruebas pasaron. La instalación limpia y auditoría real no se pudieron confirmar porque DNS no resolvió `registry.npmjs.org`. Las pruebas con DB y concurrencia siguen documentadas como smoke manual.
