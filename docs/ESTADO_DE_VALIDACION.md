# Estado de validación — Raíz & Madera

## Revisiones realizadas al preparar este ZIP

- Se revisó el esquema SQL, las rutas de API y los servicios de inventario/ventas respecto al nuevo dominio.
- Se incluyó un test de esquemas para categorías, existencias, IDs, login, pagos, validación anti-HTML y autorización por rol.
- Se comprobaron estructuralmente los JSON del workflow y la colección Postman durante la generación del ZIP.
- La interfaz React quedó adaptada al catálogo de plantas, muebles y decoración; se revisaron imports relativos y sintaxis JSX/JS con un parser estático.

## Pendiente de verificación en tu computadora

- `npm install`, `npm test`, `npm run check` y `npm run build` con dependencias reales.
- Arranque de MySQL 8.4, carga de `schema.sql`, sesiones y seed de usuarios.
- Casos transaccionales simultáneos, stock insuficiente y anulación a los 16 minutos.
- Importación/ejecución real del workflow con credencial propia de modelo y n8n accesible desde la API.
- `npm audit`, OWASP ZAP y comprobación de HTTPS/cabeceras al desplegar.

Esta documentación no declara una prueba como pasada si no se ejecutó en un entorno funcional.


## Actualización: login y registro con Google

- [x] Se añadió flujo OAuth del lado del servidor con `state`, `nonce`, PKCE S256 y verificación de correo/ID token.
- [x] Se añadieron botones de Google para acceder y crear cuenta en `/login`.
- [x] Registro nuevo se limita al rol `caja`.
- [x] Variables de Google documentadas solo en backend `.env.example`.
- [x] Migración 002 y soporte en `schema.sql` para identificadores Google.
- [ ] Pendiente: configurar las credenciales OAuth reales en Google Cloud Console y probar el callback en el equipo local; esas credenciales no pueden generarse automáticamente.


## Actualización — Fase 3 de seguridad (21-10-2026)

- Añadido Helmet, CSP en las respuestas de la API, `Permissions-Policy`, y redirect HTTPS/HSTS condicionado a producción.
- Añadida protección CSRF sincronizadora para POST/PUT/PATCH/DELETE, validación de Origin y Fetch Metadata; el cliente React adjunta `X-CSRF-Token`.
- En la revisión del 22-10-2026 se retiraron las plantillas de hosting cruzado que podían quedar con CSP placeholder; la configuración soportada ahora es Caddy + Nginx en un mismo origen HTTPS (ver `docs/PRODUCCION.md`).
- Verificación local en este entorno: `node --check` para fuentes JS seleccionadas y `node --test tests/security-phase3.test.js`: 5/5 pruebas de la protección CSRF pasaron.
- Pendiente: instalación integral de dependencias (npm install excedió el tiempo límite en este entorno), compilación Vite, pruebas con MySQL 8.4/navegador, comprobar cabeceras desde el hosting real y configurar TLS/proxy/dominio definitivo.


## Actualización — Panel de administración

- Añadida la página React `/admin`, visible solo para el rol `admin`, con resumen, accesos rápidos, gestión de usuarios, filtros, cambio de rol/estado, restablecimiento de contraseñas y actividad reciente.
- Añadidos `GET /api/admin/overview`, `GET /api/admin/users`, `POST /api/admin/users`, `PATCH /api/admin/users/:id` y `GET /api/admin/audit`; todos detrás de `requireAuth` y `requireRole('admin')`.
- Añadido `backend/migrations/003_admin_tools.sql` para bases existentes y la tabla `admin_audit_events` a `schema.sql` para instalaciones nuevas. Las acciones de administración se escriben en auditoría dentro de la misma transacción de las operaciones de usuario; catálogo y ventas añaden eventos best-effort sin interrumpir una operación ya confirmada.
- Se protege la última cuenta admin activa, se bloquea el cambio de rol/estado de la propia cuenta y se evita exponer secretos en los metadatos de auditoría.
- Verificación ejecutada aquí: `npm run check` validó sintaxis de 43 archivos del backend; `node --test tests/admin-rules.test.js` pasó 3/3; el parser de TypeScript transpuso 30 archivos JS/JSX del frontend sin errores sintácticos; JSON de Postman validado.
- Pendiente: instalar dependencias para ejecutar la suite completa y el build real de Vite; aplicar la migración en MySQL 8.4 y probar la página/operaciones con una sesión admin real. En este entorno el test conjunto no pudo importar `zod` porque las dependencias npm no están instaladas.
- La ejecución de `npm test` completa en el entorno de generación se detuvo en `tests/validation.test.js` porque no está instalado el paquete `zod`; los 12 tests ejecutados sin esa dependencia pasaron. Ejecuta `npm install` en backend antes de repetir la suite completa.


## Revisión integrada para producción — 2026-10-22

### Correcciones aplicadas en esta revisión

- React y los enlaces de OAuth usan `/api` como URL por defecto; ya no intentan conectarse al `localhost:3001` del navegador del visitante.
- Vite proxya `/api` a Express durante desarrollo para compartir origen de cookies/CSRF.
- MySQL 8.4 de desarrollo solo enlaza a `127.0.0.1`; MySQL 8.4 de producción no publica puertos del host.
- El stack de producción añade Caddy (TLS automático), Nginx no root y Express bajo un único dominio HTTPS.
- Readiness comprueba MySQL 8.4; healthchecks internos señalan el esquema esperado para no ser redirigidos desde HTTP interno a la URL pública.
- La configuración de base de datos verifica certificados TLS cuando `DB_SSL=true`; no desactiva `rejectUnauthorized`.
- El backup cifrado toma los nombres de base y usuario del entorno del contenedor de MySQL 8.4.
- El workflow de n8n de producción ya no usa `host.docker.internal`; contiene `https://TU_DOMINIO` como marcador explícito que hay que sustituir.
- Añadido `npm run check:integration` para verificar estáticamente el cableado del frontend, API, proxy HTTPS, base de datos y n8n.

### Verificaciones realizadas en este entorno

- `backend/npm run check`: sintaxis de 43 archivos JavaScript verificada.
- `backend/npm run check:integration`: 11/11 comprobaciones estáticas correctas.
- YAML de `compose.yaml`, `compose.production.yaml` y el workflow de GitHub validado por parser YAML disponible.
- JSON de package manifests válido; `bash -n` pasó para script de backup y script de creación del rol MySQL 8.4.
- Suite de backend sin dependencias instaladas: 12 pruebas pasaron; `tests/validation.test.js` no pudo cargar `zod` porque la instalación npm agotó el tiempo de espera. No es un resultado de suite completa.
- No se ejecutaron Docker, MySQL 8.4, build de Vite, OAuth real, n8n o smoke test contra un dominio en este entorno.

### Bloqueos previos a producción

- Crear/guardar los dos `package-lock.json` ejecutando `npm install` en backend y frontend con acceso al registro; revisar el resultado de `npm audit` y versionarlos.
- Ejecutar pruebas y build de frontend/backend después de instalar dependencias.
- Configurar dominio DNS, puertos/firewall, credenciales OAuth de producción, workflow y credenciales de n8n, secretos fuertes, bootstrap de usuarios y política de backup/restauración.
- Ejecutar el smoke test HTTPS y un escaneo OWASP ZAP desde el dominio publicado.
- `schema.production.sql` crea una base nueva y vacía; no es un script de migración para copiar directamente la base de desarrollo a producción.


## Actualización — Migración de PostgreSQL a MySQL y conexión n8n (2026-10-22)

- La versión actual del runtime utiliza `mysql2/promise`, MySQL 8.4 y `express-mysql-session`. Los documentos antiguos que mencionan PostgreSQL describen la base original; no se deben reutilizar `DATABASE_URL`, `pg`, ni los comandos `psql` para la versión actual.
- `schema.sql` es un esquema de desarrollo con datos de demostración y contiene instrucciones destructivas `DROP TABLE`. `schema.production.sql` crea un esquema vacío y no migra datos de PostgreSQL.
- La tabla `user_sessions` debe existir antes de aceptar login. Se añadió explícitamente a `schema.production.sql` y `check-integration.mjs` ahora la verifica.
- n8n no tiene conexión directa a MySQL: React llama a Express; Express llama al webhook protegido; las herramientas del agente consultan los endpoints GET de reportes usando `N8N_API_SERVICE_TOKEN`.
- Verificación ejecutada: `backend/npm run check` pasó para 44 archivos JS; `backend/npm run check:integration` pasó 18/18 comprobaciones estáticas, incluida la tabla de sesiones; `node --test tests/logger.test.js tests/request-logger.test.js tests/security-phase3.test.js tests/admin-rules.test.js` pasó 12/12.
- Pendiente: `npm install` agotó el tiempo en este entorno; no se crearon lockfiles. No se ejecutaron MySQL, Docker Compose, el build real de Vite, Google OAuth ni n8n con credenciales reales. Deben probarse en el equipo local.
