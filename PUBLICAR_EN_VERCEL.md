# Publicar Raíz & Madera en Vercel

Este repositorio está preparado como **un único proyecto Vercel desde la raíz**. No importes únicamente `frontend/` o `backend/`: el archivo raíz `vercel.json`, el `package.json` raíz, `index.js` y `scripts/prepare-vercel-public.mjs` conectan el build de React con la función Express.

## 1. Antes de importar

1. Sube esta carpeta completa a GitHub, con `vercel.json` en el primer nivel del repositorio.
2. No subas archivos `.env`, secretos OAuth ni tokens de n8n.
3. Debes tener MySQL 8 accesible de forma remota con TLS. Vercel no puede acceder a un MySQL que esté en `localhost` o solo en tu computadora.
4. Debes tener n8n accesible por HTTPS para que funcione el asistente.

## 2. Importar

En https://vercel.com/new selecciona el repositorio y elige la entrada del **directorio raíz** `Raiz-Madera (root/raíz)`. No selecciones el subproyecto `frontend` ni `backend`: este bundle publica React y Express juntos bajo el mismo dominio.

Configura:

- Root Directory: `./` (raíz del repositorio).
- Install Command: `npm install --include=dev`.
- Build Command: `npm run vercel-build`.
- Output Directory: dejar vacío.
- Node.js: una versión compatible con Node `>=22.12.0` (recomendado Node 22 LTS si aparece disponible en el proyecto).

El `vercel.json` ya define el comando de build, instalación, duración de la función y cabeceras. Si el Dashboard detecta automáticamente estos valores, conserva los valores del archivo.

## 3. Variables de entorno

En Vercel → Project → Settings → Environment Variables, crea las variables descritas en `.env.vercel.example`. Como mínimo:

- `NODE_ENV=production`
- `SESSION_SECRET`: secreto aleatorio nuevo de al menos 32 bytes.
- `TRUST_PROXY_HOPS=1`
- `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `DB_SSL=true`.
- `DB_POOL_MAX=2` y `SESSION_DB_POOL_MAX=2`.
- `PUBLIC_HTTPS_ORIGIN=https://TU_PROYECTO.vercel.app`
- `CORS_ORIGIN=https://TU_PROYECTO.vercel.app`
- `FRONTEND_URL=https://TU_PROYECTO.vercel.app`
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`.
- `N8N_WEBHOOK_URL`, `N8N_WEBHOOK_AUTH_TOKEN`, `N8N_API_SERVICE_TOKEN`.

No uses placeholders al publicar. Define los valores reales dentro del Dashboard, nunca en Git. Para producción, usa un secreto OAuth nuevo si uno anterior fue compartido.

## 4. MySQL

Importa `schema.production.sql` a una base MySQL remota vacía. No uses `schema.sql` de desarrollo para una base de datos con información real, porque contiene datos de ejemplo e instrucciones de reinicio. Crea un usuario de aplicación con permisos limitados, TLS habilitado y acceso de red desde Vercel.

Inicializa las cuentas desde un entorno local confiable conectado a la base remota y usando `backend/.env` protegido:

```bash
cd backend
npm install
npm run users:seed
```

No ejecutes la creación inicial repetidamente sin revisar las contraseñas y cuentas objetivo.

## 5. Google OAuth

Después de que Vercel asigne una URL, en Google Cloud Console, cliente OAuth de tipo Web:

- Authorized JavaScript origin: `https://TU_PROYECTO.vercel.app`
- Authorized redirect URI: `https://TU_PROYECTO.vercel.app/api/auth/google/callback`

Usa exactamente el mismo valor para `GOOGLE_REDIRECT_URI` en Vercel. Si cambias dominio o usas un dominio personalizado, actualiza también estas entradas y redepliega.

## 6. n8n

Importa `n8n/workflow_raiz_madera.json` en n8n Cloud o una instancia HTTPS pública. Asigna la credencial del proveedor de IA. Configura el Webhook con Header Auth `x-rm-webhook-token` igual a `N8N_WEBHOOK_AUTH_TOKEN`; las herramientas HTTP deben usar otra credencial Header Auth `x-service-token` igual a `N8N_API_SERVICE_TOKEN`.

Cambia las URL locales de herramientas por las rutas reportes reales documentadas en `backend/src/routes/reportes.routes.js`. Copia la Production URL del webhook a `N8N_WEBHOOK_URL` en Vercel y crea un nuevo deployment.

## 7. Probar tras publicar

- `https://TU_PROYECTO.vercel.app/` muestra la aplicación.
- `https://TU_PROYECTO.vercel.app/login` carga también al recargar (React Router).
- `https://TU_PROYECTO.vercel.app/api/health` responde JSON `ok: true`.
- `https://TU_PROYECTO.vercel.app/api/ready` responde `database: ready`.
- Prueba login tradicional y Google, CRUD según rol, CSRF, ventas, devolución por cancelación y asistente n8n.

Si una ruta `/api` devuelve HTML, revisa que hayas importado la raíz correcta y que el build generado haya terminado. Si `/api/ready` falla, revisa host/credenciales/TLS/permisos de MySQL. Si Google falla, compara el callback exacto. Si n8n falla, revisa la Production URL y ambas credenciales Header Auth.

## 8. Comprobación antes de subir

Ejecuta desde esta carpeta:

```bash
node -e "JSON.parse(require('fs').readFileSync('vercel.json','utf8')); console.log('vercel.json válido')"
npm install
npm run check:vercel
npm run vercel-build
npm run check:integration
npm --workspace raiz-madera-api run check
npm --workspace raiz-madera-api test
```

La compilación y las pruebas deben terminar correctamente antes de tratar el deployment como listo. Vercel no puede probar tus credenciales privadas ni la disponibilidad de tu MySQL/n8n por adelantado.
