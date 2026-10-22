# Desplegar Raíz & Madera en Vercel

Este repositorio usa el soporte oficial de Express en Vercel: Express se exporta como función y el build de Vite copia sus archivos a `public/`. Vercel sirve esos archivos desde su CDN, mientras que Express procesa `/api/*` y devuelve el HTML compilado para rutas de React Router.

## Antes de importar el repositorio

Vercel no ejecuta `compose.yaml`, no aloja tu MySQL dentro del despliegue y no mantiene un contenedor n8n persistente. Se necesitan estos servicios externos:

1. **MySQL administrado** accesible desde Internet con TLS habilitado. El servidor debe permitir conexiones desde Vercel según las opciones de red/allowlist que ofrezca el proveedor. No configures `DB_HOST=localhost`, `127.0.0.1` ni la IP privada de tu computadora.
2. **n8n Cloud o un servidor n8n HTTPS** accesible públicamente. No uses la URL local del equipo o de Docker.
3. **Google OAuth** configurado para el dominio Vercel elegido.

## 1. Cargar el esquema de MySQL

Crea una base `raiz_madera` (o usa el nombre que te proporcione el proveedor), importa `schema.production.sql` con MySQL Workbench o el cliente `mysql`, y no ejecutes `schema.sql` en una base de producción porque es el esquema de desarrollo y puede contener datos de ejemplo/instrucciones destructivas.

Configura el usuario de aplicación con permisos mínimos. La cuenta debe poder leer y modificar las tablas de la aplicación y la tabla `user_sessions`, pero no administrar usuarios ni permisos globales del servidor MySQL. Usa TLS y, si el proveedor proporciona CA propia, define `DB_SSL_CA_FILE` no es práctico en Vercel sin empaquetar CA; en ese caso añade CA al bundle de confianza o utiliza la cadena CA pública documentada por el proveedor.

## 2. Subir el repositorio a GitHub

Desde la carpeta raíz del proyecto:

```bash
git init
git add .
git commit -m "chore: preparar Raíz & Madera para Vercel"
git branch -M main
git remote add origin URL_DE_TU_REPOSITORIO
git push -u origin main
```

Si ya existe el repositorio Git, no repitas `git init` ni `git remote add origin`; usa `git status` y `git remote -v`.

## 3. Importar en Vercel

1. Abre https://vercel.com/new y selecciona el repositorio.
2. **Root Directory:** `./` (raíz del repositorio; NO selecciones `frontend/` ni `backend/`).
3. Framework: deja que Vercel detecte Express. No configures Output Directory.
4. Build Command: `npm run vercel-build` (ya definido en `vercel.json`). Install Command: `npm install --include=dev` para que Vite/plugin-react (devDependencies) estén disponibles durante el build.
5. El runtime de Node debe ser 22.12 o una versión soportada que satisfaga `engines` en `package.json`.

La compilación de Vite genera `frontend/dist`; `scripts/prepare-vercel-public.mjs` copia los assets a `public/` y genera el HTML SPA empaquetado en `backend/src/generated-spa.js`. No configures `VITE_API_URL` con una URL localhost: el frontend usa `/api` y el mismo dominio para evitar CORS/cookies cross-site. Al trabajar como workspace, el lockfile correcto para Vercel es `package-lock.json` en la raíz; créalo con `npm install` desde la raíz y súbelo a Git una vez verificadas las dependencias.

## 4. Añadir variables de entorno

En Vercel → Project → Settings → Environment Variables añade las variables de `.env.vercel.example`. Selecciona Production y, si vas a probar ramas, añade valores correctos también para Preview. No pegues `.env.production` entero al repositorio.

- `NODE_ENV=production`
- `SESSION_SECRET`: secreto nuevo de al menos 32 bytes; preferible 48 bytes aleatorios en hex.
- `TRUST_PROXY_HOPS=1`
- `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `DB_SSL=true`, `DB_POOL_MAX=2`, `SESSION_DB_POOL_MAX=2`
- `PUBLIC_HTTPS_ORIGIN` y `CORS_ORIGIN`: origen HTTPS del dominio. Ejemplo `https://raiz-y-madera.vercel.app`. Para dominio personalizado, usa ese dominio en ambos.
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`, `FRONTEND_URL`
- `N8N_WEBHOOK_URL`, `N8N_WEBHOOK_AUTH_TOKEN`, `N8N_API_SERVICE_TOKEN`

Vercel ofrece `VERCEL_URL` y `VERCEL_PROJECT_PRODUCTION_URL`, que la aplicación utiliza como fallback para el origen HTTPS durante el arranque. Aun así, configura `PUBLIC_HTTPS_ORIGIN`/`CORS_ORIGIN` explícitamente para el dominio de producción. Después de cambiar variables hay que crear un nuevo deployment.

## 5. Configurar Google OAuth

En Google Cloud Console, cliente OAuth de tipo Web application, añade exactamente:

- Authorized JavaScript origin: `https://TU_PROYECTO.vercel.app`
- Authorized redirect URI: `https://TU_PROYECTO.vercel.app/api/auth/google/callback`

Cambia el dominio por el real, incluida la URL del dominio personalizado si lo utilizas. `GOOGLE_REDIRECT_URI` debe coincidir carácter por carácter. Para permitir logins en Preview se deben autorizar y configurar sus dominios/redirect URIs por separado; la configuración recomendada para producción limita OAuth al dominio productivo.

## 6. Inicializar usuarios y verificar base

No se crea un administrador automáticamente por desplegar la Function. Desde un entorno local seguro, crea `backend/.env` apuntando al MySQL administrado y con variables `SEED_ADMIN_*`, `SEED_MANAGER_*`, `SEED_CASHIER_*` únicas. En `backend/` ejecuta `npm install` y `npm run users:seed`. Mantén los secretos fuera del repositorio y borra el archivo local si es una máquina compartida.

Después del primer deploy, prueba:

- `https://TU_PROYECTO.vercel.app/` → página de login.
- `https://TU_PROYECTO.vercel.app/login` → React Router debe cargar la aplicación.
- `https://TU_PROYECTO.vercel.app/api/health` → `{ ok: true, ... }`.
- `https://TU_PROYECTO.vercel.app/api/ready` → debe indicar `database: ready`. Un 500/503 suele indicar credenciales, TLS/firewall o esquema MySQL incorrectos.

## 7. Configurar n8n

Importa `n8n/workflow_raiz_madera.json` en n8n Cloud o un servidor propio HTTPS. En los dos HTTP Request Tools, reemplaza la URL local por `https://TU_PROYECTO.vercel.app/api/reportes/productos-bajo-stock` y `https://TU_PROYECTO.vercel.app/api/reportes/ventas-semana` (revisa los path finales documentados en `backend/src/routes/reportes.routes.js`), y crea la credencial Header Auth `x-service-token` con el mismo valor que `N8N_API_SERVICE_TOKEN`.

En el Webhook crea Header Auth `x-rm-webhook-token` con el valor de `N8N_WEBHOOK_AUTH_TOKEN`. Asigna una credencial real al nodo de modelo de chat, activa el workflow y copia su **Production URL** a `N8N_WEBHOOK_URL` en Vercel; después crea un nuevo deployment.

No publiques los tokens dentro del JSON del workflow ni uses URLs `localhost`/`host.docker.internal` desde n8n alojado en la nube.

## 8. Validación antes de aceptar usuarios

En local, con dependencias instaladas:

```bash
npm install
npm run check:vercel
npm run vercel-build
npm run check:integration
npm --workspace raiz-madera-api run check
npm --workspace raiz-madera-api test
npm --workspace raiz-madera-api run audit
npm --workspace raiz-madera-frontend run audit
```

Después de desplegar, comprueba login local, login Google, CSRF, roles `admin`/`encargado`/`caja`, CRUD, creación/cancelación de ventas, asistente n8n, cabeceras y logs de Vercel. Las comprobaciones estáticas no sustituyen pruebas reales con tu base remota y tus credenciales.

## Límites conocidos

- Vercel no aloja MySQL ni n8n por ejecutar este proyecto. Esos servicios deben existir y ser accesibles por red.
- Preview deployments no comparten necesariamente la misma configuración OAuth que Production.
- Los pools de MySQL están reducidos en Vercel para evitar multiplicar conexiones con el escalado serverless.
- El primer deployment crea la URL. Registra el callback y las variables OAuth usando esa URL y redepliega.
