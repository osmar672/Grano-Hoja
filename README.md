# Grano & Hoja

Punto de venta e inventario para una cafetería: catálogo de bebidas y repostería, insumos con unidades de medida, recetas por producto, pedidos, movimientos de consumo y reportes. La aplicación usa React/Vite, Node.js/Express, MySQL 8/InnoDB y un workflow opcional de n8n.

> **Estado comprobado en esta sesión:** `backend/npm run check`, `backend/npm test` (39 pruebas), el verificador de Vercel (20/20) y los contratos estáticos de integración (33/33) pasan con los módulos presentes en el ZIP. La instalación limpia y el build completo no se pudieron verificar porque el entorno no resuelve `registry.npmjs.org`. No se pudo probar MySQL real, Google OAuth, Vercel ni n8n desde esta sesión.

## Componentes

- `frontend/`: React, Vite, React Router y CSS propio. Consume la API mediante `/api`.
- `backend/`: Express ES modules, `mysql2/promise`, sesiones guardadas en MySQL, Zod, Helmet, limitación de intentos, roles, CSRF y Google OAuth.
- `schema.sql`: esquema de desarrollo y datos de demostración de cafetería. **Es destructivo**: incluye `DROP TABLE`; úsalo solo para una base desechable.
- `schema.production.sql`: esquema inicial de producción sin datos de demostración y sin instrucciones `DROP`.
- `backend/migrations/004_insumos_recetas.sql`: migración aditiva de insumos, recetas y movimientos; se aplica después de las migraciones previas/esquema que corresponda.
- `n8n/workflow_grano_hoja.json`: workflow oficial opcional para sugerencias de reposición, consulta de insumos bajos y reportes. No incluye credenciales.
- `compose.yaml`: MySQL y n8n para desarrollo; API y frontend se inician desde sus carpetas.
- `compose.production.yaml`: configuración alternativa contenerizada. La configuración de Vercel Services está en `vercel.json` y `docs/VERCEL_SERVICES.md`.

## Requisitos

Node.js 22.12 o superior (el CI usa Node 24), npm, MySQL 8.0.16+ —recomendado 8.4— e InnoDB. Docker Compose facilita el MySQL local. Google Cloud OAuth y un proveedor de modelo de chat solo son necesarios si vas a probar esas integraciones.

## Desarrollo en PowerShell

### 1. Configurar entorno local

Desde la carpeta principal del proyecto:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\configurar-integracion-local.ps1
```

El asistente crea/actualiza `.env` y `backend/.env`; los secretos no se imprimen. Estos archivos reales están ignorados por Git y excluidos de los paquetes de distribución. Si prefieres hacerlo manualmente, copia `.env.example` a `.env` y `backend/.env.example` a `backend/.env`. Mantén `MYSQL_APP_PASSWORD` y `DB_PASSWORD` sincronizadas, y usa valores distintos para `MYSQL_ROOT_PASSWORD`, `MYSQL_APP_PASSWORD`, `SESSION_SECRET`, `N8N_ENCRYPTION_KEY`, `N8N_WEBHOOK_AUTH_TOKEN` y `N8N_API_SERVICE_TOKEN`.

### 2. Iniciar MySQL y n8n

```powershell
docker compose up -d db n8n
docker compose ps
```

En un volumen MySQL nuevo, Docker ejecuta `schema.sql` y carga datos demo. Si el volumen ya existe, los scripts de inicialización no se repiten. Los identificadores antiguos de volúmenes Docker se conservaron intencionalmente para volver a conectar datos existentes; **no los renombres sin planificar la migración de volúmenes**. No uses `docker compose down -v` si hay datos que deban conservarse.

### 3. Instalar y comprobar backend

```powershell
Push-Location backend
npm install --no-fund --no-audit
npm run check
npm run check:integration
npm test
npm audit --audit-level=moderate
Pop-Location
```

Configura las variables de `backend/.env.example` en el `.env` real. Para iniciar la API, desde `backend/`: `npm run dev`. Endpoints de disponibilidad: `/api/health` y `/api/ready`.

### 4. Instalar y ejecutar frontend

```powershell
Push-Location frontend
npm install --no-fund --no-audit
npm audit --audit-level=moderate
$env:VITE_API_URL = '/api'
npm run build
npm run dev
Pop-Location
```

Abre `http://localhost:5173`. En desarrollo Vite dirige `/api` al backend local. Las dependencias deben instalarse desde cada carpeta: no se configura un workspace npm en el nivel superior; cada paquete mantiene su propio `package-lock.json` para alinearse con el CI y la configuración de Vercel. Los lockfiles incluidos aún necesitan regenerarse con el registro npm accesible; véase `docs/ESTADO_DE_VALIDACION.md`.

## Modelo funcional

- `insumos`: nombre único, unidad (`g`, `ml`, `unidad`, etc.), stock actual/mínimo y estado activo.
- `recetas`: cantidad de cada insumo por unidad de producto; una combinación producto/insumo solo puede aparecer una vez.
- `pedidos`: se crea pendiente. Al confirmar, el backend agrupa el consumo para todas las líneas, bloquea las filas de insumos en orden por ID, comprueba stock y, dentro de una transacción MySQL, descuenta el inventario, registra movimientos y confirma. Un faltante responde `409` y hace rollback.
- Al anular un pedido confirmado dentro de los 15 minutos permitidos, se restituyen los consumos guardados en los movimientos originales, sin usar la receta actual ni devolver dos veces. Una segunda anulación se rechaza.
- Los productos sin receta se pueden vender, pero no descuentan insumos ni el campo histórico `productos.stock`. Crea receta en cada producto cuyo consumo debe controlarse.
- El campo de stock de producto anterior se conserva por compatibilidad de registros, pero **no representa la existencia de ingredientes**.

## Google OAuth y n8n

Consulta `docs/GOOGLE_OAUTH_SETUP.md` y `docs/MYSQL_N8N_SETUP.md`. Google necesita un Client ID/Secret y el callback exacto configurado en Google Cloud. n8n usa el webhook `/webhook/grano-hoja/asistente-compras`, una credencial Header Auth para `x-gh-webhook-token`, otra para `x-service-token` y credencial de modelo. Las credenciales se configuran directamente en n8n; no van en el JSON ni en variables `VITE_*`.

## Verificadores y tests manuales

```powershell
node scripts/check-vercel.mjs
node scripts/check-integration.mjs
```

Los tests puros de consumo no requieren MySQL. Las pruebas de migración, bloqueos `FOR UPDATE`, concurrencia, confirmación/anulación y movimientos deben correr con MySQL real; están documentadas en `tests/README.md` y `tests/smoke.http`. Las ejecuciones de Vercel, OAuth y n8n también requieren sus servicios/credenciales reales.

## Vercel Services

La configuración principal es `vercel.json`: el rewrite `/api/*` dirige al backend y el resto al frontend React/Vite. Selecciona **Framework Preset: Services** y el directorio del proyecto `./`. MySQL y n8n son servicios externos, por lo que requieren acceso de red y TLS. La lista de variables está en `.env.vercel.example`; pasos y diagnóstico de logs en `docs/VERCEL_SERVICES.md`.

Antes de distribuir, usa `scripts/Empaquetar-Proyecto.ps1`. Excluye `.env` reales, node_modules, dist y `.git`. Si el ZIP anterior con `backend/.env` se compartió, considera expuestos sus valores y rota `SESSION_SECRET`, credenciales MySQL y claves/secretos de Google, además de los tokens n8n si eran reales.
