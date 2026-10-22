# Raíz & Madera

Tienda de plantas, muebles y decoración. Aplicación full-stack con React + Vite, API REST en Node.js/Express, MySQL 8.4, sesiones seguras, roles, Google OAuth y asistente de reposición con n8n.

> **Estado:** proyecto preparado para probar en local. Antes de producción debes ejecutar las pruebas localmente, revisar `npm audit`, configurar un dominio HTTPS, crear/rotar secretos reales y probar Google OAuth/n8n. No se afirma que servicios externos estén probados sin tus credenciales.

## Stack
- `frontend/`: React, Vite, React Router y CSS propio; las solicitudes van a `/api`.
- `backend/`: Express por capas, `mysql2/promise`, `express-session`, almacenamiento de sesiones en MySQL, bcrypt, Zod, Helmet, CORS de lista blanca y protección CSRF.
- `schema.sql`: estructura MySQL 8.4 más datos demostrativos de productos y ventas.
- `schema.production.sql`: estructura sin datos de demostración ni instrucciones DROP.
- `n8n/workflow_raiz_madera.json`: agente de reposición; se importan credenciales dentro de n8n, nunca dentro del JSON.
- `compose.yaml`: MySQL y n8n para desarrollo local. La API y React se ejecutan en terminales; n8n está en Docker.
- `compose.production.yaml`: MySQL privada, API, frontend/Nginx y Caddy HTTPS. La instancia productiva de n8n se configura aparte (n8n cloud/servidor seguro) y se conecta por HTTPS.

## Requisitos
- Node.js 22.12+ y npm.
- Docker Desktop / Docker Compose.
- Cuenta/proyecto de Google Cloud OAuth si vas a probar inicio de sesión con Google.
- Una credencial de modelo de chat (por ejemplo, OpenAI) para el agente de n8n.

## Desarrollo en Windows (PowerShell)

### 1. Configurar el entorno

Desde la raíz del repositorio, la forma sencilla es ejecutar el asistente de configuración. Genera secretos para MySQL/sesión/n8n, alinea las variables DB_* y te pide de forma oculta las contraseñas iniciales y un nuevo Google Client Secret si aún no está configurado:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\configurar-integracion-local.ps1
```

El script escribe `.env` y `backend/.env`, que son locales y están excluidos de Git. No imprime los secretos. Si prefieres hacerlo a mano, copia `.env.example` a `.env` y `backend/.env.example` a `backend/.env`, y completa los campos vacíos. La contraseña `MYSQL_APP_PASSWORD` de la raíz debe ser **idéntica** a `DB_PASSWORD` de `backend/.env`. El script de creación del usuario exige una contraseña de al menos 32 caracteres alfanuméricos/guion/guion bajo. Genera claves distintas con:

```powershell
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

Usa valores diferentes para `MYSQL_ROOT_PASSWORD`, `MYSQL_APP_PASSWORD`, `SESSION_SECRET`, `N8N_ENCRYPTION_KEY`, `N8N_WEBHOOK_AUTH_TOKEN` y `N8N_API_SERVICE_TOKEN`. No copies secretos de chats ni uses el antiguo Google Client Secret si ya fue compartido; rota el secreto en Google Cloud y guarda el nuevo solo en `backend/.env`.

### 2. Iniciar MySQL y n8n

```powershell
docker compose up -d db n8n
```

El primer arranque de un volumen MySQL nuevo ejecuta `schema.sql` y carga los datos demostrativos. Si ya existe el volumen, el contenedor **no** vuelve a ejecutar el esquema. Para reiniciar una base de demostración descartable desde cero, solo si aceptas perder todos sus datos:

```powershell
docker compose down
# ADVERTENCIA: elimina datos si también agregas -v. No uses -v si hay ventas que conservar.
docker compose up -d db n8n
```

La base está enlazada solamente a `127.0.0.1:3306`; no la expongas a Internet.

### 3. Instalar e iniciar la API

```powershell
cd backend
npm install
npm run check
npm test
npm run users:seed
npm run dev
```

`npm run users:seed` necesita las tres contraseñas seguras definidas en `backend/.env`. Este script crea/actualiza usuarios de muestra `admin`, `encargado` y `caja`. No uses esas cuentas de ejemplo en producción.

API: `http://localhost:3001/api/health` y `http://localhost:3001/api/ready`.

### 4. Iniciar React

Abre una terminal nueva, desde la raíz:

```powershell
cd frontend
npm install
npm run build
npm run dev
```

Abre `http://localhost:5173`. El frontend utiliza `/api` y Vite proxy al backend en `http://127.0.0.1:3001`. No configures una URL localhost pública para producción.

## Conectar n8n con la página

Sigue el paso-a-paso completo en [`docs/MYSQL_N8N_SETUP.md`](docs/MYSQL_N8N_SETUP.md). Resumen:
1. Abre `http://localhost:5678`, termina el onboarding de n8n.
2. Importa `n8n/workflow_raiz_madera.json`.
3. Crea una credencial **Header Auth** para el nodo Webhook: header `x-rm-webhook-token`, valor exactamente igual a `N8N_WEBHOOK_AUTH_TOKEN` del backend.
4. Crea otra credencial **Header Auth** para los nodos HTTP Request Tool: header `x-service-token`, valor igual a `N8N_API_SERVICE_TOKEN` del backend. Asigna esa credencial a ambas herramientas.
5. Asigna una credencial válida al nodo **OpenAI Chat Model** (el workflow exportado no incluye credenciales).
6. Activa el workflow y comprueba que su ruta sea `/webhook/raiz-madera/asistente-compras`.
7. React llama a `POST /api/agente/sugerencia-compra`; Express valida sesión/rol, llama al webhook con el token privado y devuelve `{ ok, data, error }`. n8n consulta los reportes a través de endpoints protegidos de Express; no conecta directamente a MySQL.

## Conectar Google OAuth

Consulta [`docs/GOOGLE_OAUTH_SETUP.md`](docs/GOOGLE_OAUTH_SETUP.md). En Google Cloud Console, para desarrollo local configura:
- Origen autorizado: `http://localhost:5173`
- URI de redireccionamiento: `http://localhost:3001/api/auth/google/callback`

Completa `GOOGLE_CLIENT_ID` y el nuevo `GOOGLE_CLIENT_SECRET` en `backend/.env`. Si la pantalla OAuth está en modo de prueba, añade tu cuenta en la lista de usuarios de prueba. Nunca coloques el secreto en variables `VITE_` ni en Git.

## Base de datos MySQL

Conexión local desde MySQL Workbench: host `127.0.0.1`, puerto `3306`, base `raiz_madera`, usuario `raiz_app`; contraseña igual a `MYSQL_APP_PASSWORD`/`DB_PASSWORD`. También puedes usar:

```powershell
docker compose exec db mysql -u raiz_app -p raiz_madera
```

Para instalar una **base nueva de producción**, el Compose ejecuta `schema.production.sql`, que no incluye pedidos/products de demo. No se debe ejecutar `schema.sql` sobre datos reales: contiene `DROP TABLE` y datos de ejemplo. Migrar desde una base PostgreSQL antigua requiere un proceso de exportación/importación separado; cambiar las variables de entorno no migra datos.

## Pruebas, logs y despliegue

```powershell
cd backend
npm run check:integration
npm test
npm run audit
npm run outdated
cd ../frontend
npm run build
npm run audit
```

Importa `tests/Raiz-y-Madera.postman_collection.json` en Postman para las pruebas API. Consulta `docs/RELEASE_CHECKLIST.md`, `docs/PRODUCCION.md` y `SECURITY.md` antes de publicar. Para producción necesitas dominio/DNS, secretos diferentes, OAuth autorizado en HTTPS, n8n accesible mediante HTTPS, backup cifrado probado y escaneos de seguridad. `compose.production.yaml` no expone MySQL en el host.

## Desplegar en Vercel

Ejecuta `npm run check:vercel` para revisar la configuración específica de Vercel antes de publicar.

Para una versión de un solo proyecto Vercel (Express como Function + frontend Vite en `public/`), revisa [`docs/VERCEL.md`](docs/VERCEL.md). La raíz del proyecto debe ser `./`, y el build genera los assets estáticos. Vercel **no aloja MySQL ni n8n**: necesitas servicios externos HTTPS/TLS y configurar las variables de entorno en el panel. No subas archivos `.env`.

## Carpetas principales

```text
backend/src/routes/          # rutas REST
backend/src/controllers/     # entrada HTTP/respuestas
backend/src/services/        # lógica de negocio/SQL parametrizado
backend/src/middleware/      # sesiones, roles, CSRF, validación, logs
backend/src/db.js            # pool mysql2/promise
frontend/src/pages/           # pantallas React
frontend/src/components/      # componentes compartidos
frontend/src/services/api.js  # única capa de solicitudes a API
n8n/workflow_raiz_madera.json # agente de reposición
schema.sql                    # esquema de desarrollo + seed
schema.production.sql         # esquema inicial sin datos demo
```

## Licencia y datos

Los datos de ejemplo son ficticios. Para ventas reales, define política de privacidad, acceso, retención, copias cifradas y procedimientos de respuesta a incidentes antes de lanzar públicamente.
