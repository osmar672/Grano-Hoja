# Arquitectura — Grano & Hoja

## Componentes

- **Frontend:** React + Vite + React Router. Las solicitudes usan `frontend/src/services/api.js` y prefijo `/api`; la sesión se comprueba desde `AuthProvider`.
- **Backend:** Node.js ES modules + Express, MySQL mediante `mysql2/promise`, `express-session` con almacenamiento MySQL, Zod, Helmet, bcrypt, middleware de roles, CSRF, rate limit y registro de errores.
- **Datos:** MySQL 8/InnoDB/utf8mb4. `productos` representa los artículos vendibles; `insumos` registra existencias medibles; `recetas` expresa consumo por unidad de producto; `movimientos_inventario` conserva consumos y restituciones.
- **Agente:** n8n recibe llamadas desde el backend y consulta endpoints protegidos/limitados con un token de servicio. No se conecta directamente a MySQL.
- **Despliegue:** `vercel.json` define los servicios backend y frontend. MySQL y n8n se consideran servicios externos para Vercel Services. `compose.yaml` y `compose.production.yaml` son alternativas contenerizadas.

## Flujo de una venta

1. `POST /api/pedidos` valida productos, precio actual y cantidad, y guarda una venta pendiente con el precio unitario capturado.
2. `POST /api/pedidos/:id/confirmar` abre una transacción, bloquea el pedido y los productos en orden estable, lee las recetas, suma el consumo de insumos repetidos y bloquea las filas de inventario por ID.
3. Si falta stock, lanza `AppError` 409 y hace `ROLLBACK`, sin confirmar ni consumir parcialmente. Si hay suficiente, descuenta ingredientes, registra un movimiento por insumo y confirma dentro de la misma transacción.
4. `POST /api/pedidos/:id/anular` permite anular pedidos pendientes sin restitución. Un pedido confirmado solo se puede anular dentro de 15 minutos; la restitución usa los consumos originales guardados en `movimientos_inventario`, y se protege contra restitución duplicada.
5. Si un producto no tiene receta, se puede vender, pero no consume ingredientes ni su campo histórico `productos.stock`. Antes de usar el sistema en una cafetería real, asigna recetas a los productos que deban afectar inventario.

## Esquema de inventario

`insumos`: nombre único, unidad, `stock_actual`, `stock_minimo`, estado y timestamps. `recetas`: par único producto/insumo y cantidad decimal positiva. `movimientos_inventario`: tipo `consumo`, `restitucion` o `ajuste`, cantidad positiva, fecha y referencias al insumo/pedido. Las claves foráneas restringen la eliminación de insumos relacionados con recetas/movimientos.

La migración `backend/migrations/004_insumos_recetas.sql` es aditiva con respecto a las tablas existentes: crea nuevas tablas y ajusta el CHECK de categorías conservando categorías históricas. Requiere que la estructura previa y la constraint `productos_category_allowed` existan como esperan los esquemas del proyecto. No se ejecutó contra MySQL real durante esta auditoría.

## Roles y seguridad

La interfaz oculta enlaces según `frontend/src/auth/permissions.js`, pero el backend valida sesión y roles en cada endpoint. Los cambios de recetas e insumos requieren `admin` o `encargado`; lectura es para roles autorizados. El webhook de n8n y los endpoints de servicio usan tokens dedicados. No almacenes secretos en el workflow JSON, el frontend ni el repositorio.

El limitador de autenticación usa el almacenamiento en memoria predeterminado. En entornos serverless/multiinstancia, los contadores no se comparten; para una protección distribuida debe añadirse/configurarse un almacén compartido compatible con `express-rate-limit`.

## Entornos de despliegue

Vercel Services publica `/api/*` mediante rewrite hacia Express y dirige el resto al frontend Vite. El backend requiere acceso a MySQL por TLS cuando corresponda y a n8n si se habilita el agente. `compose.production.yaml` constituye un despliegue alternativo; no se ha verificado en ejecución real desde este entorno.

## Estado verificado

Comprobaciones locales con módulos ya disponibles: sintaxis del backend (52 archivos), 39 pruebas `node:test`, 31 contratos estáticos frontend/backend/n8n, 20 verificaciones de Vercel y análisis de parseo de 34 módulos JSX. La instalación limpia, el build de producción, auditorías online, MySQL real, Vercel, Google OAuth y n8n quedan pendientes por limitaciones del entorno o requerir servicios/credenciales reales.
