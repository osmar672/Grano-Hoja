# Publicar Raíz & Madera usando Vercel Services

Esta versión utiliza dos servicios Vercel dentro de un único proyecto: `backend` (Express) y `frontend` (Vite/React). La configuración principal es `vercel.json` en la raíz del repositorio.

## 1. Requisitos

- Repositorio Git con este proyecto completo y `vercel.json` en la raíz.
- Acceso a Vercel Services (beta) y opción **Framework Preset: Services** en el proyecto.
- MySQL 8 accesible remotamente con TLS. No puede estar únicamente en `localhost` o dentro del Docker local.
- n8n accesible por HTTPS con el workflow importado y sus credenciales privadas configuradas.
- Dominio asignado por Vercel para completar OAuth y variables de entorno después del primer despliegue.

## 2. Importar el repositorio

1. Sube el contenido completo de la carpeta `Raiz-y-Madera` a GitHub.
2. En Vercel, importa el repositorio como proyecto desde el directorio raíz `./`.
3. En **Settings → Build and Deployment → Framework Preset**, selecciona **Services**. No selecciones solo Vite, Express, `frontend/` ni `backend/` como proyecto raíz.
4. Deja que `vercel.json` controle las órdenes de instalación y build por servicio. No agregues overrides globales de `Build Command`, `Install Command`, `Output Directory` o `Framework` en la raíz.
5. Publica el proyecto. La primera compilación debe construir ambos servicios de forma independiente.

## 3. Enrutamiento público

La configuración expone:

- `frontend` en `/*` (web pública; las páginas que requieren sesión siguen protegidas por la aplicación).
- `backend` solo en `/api/*` (API pública necesaria para el navegador, protegida con sesión, roles, validación y CSRF según el endpoint).

Las reglas aparecen en ese orden: `/api/(.*)` debe ir antes de `/(.*)`. El backend conserva el prefijo `/api`, coherente con sus routers Express.

## 4. Binding de Vercel Services

En esta arquitectura no se declaran bindings de servicio porque no existe una llamada privada server-to-server entre dos servicios Vercel:

- El frontend Vite es estático; el navegador llama al mismo dominio mediante `/api/*`. Las URLs de binding no están disponibles en código JavaScript estático ejecutado en el navegador.
- El backend llama a MySQL, una base de datos externa, por `DB_HOST` y variables relacionadas.
- El backend llama a n8n, una instancia externa, por `N8N_WEBHOOK_URL`.
- n8n llama a los reportes protegidos por HTTPS usando `N8N_API_BASE_URL` y `N8N_API_SERVICE_TOKEN`.

No añadimos un binding ficticio. Si más adelante se crea una API interna como otro servicio Vercel server-side, ese servicio debe definirse en `services` y el caller podrá usar el binding correspondiente.

## 5. Variables de entorno

En Vercel → Project → Settings → Environment Variables configura los campos de `.env.vercel.example`. Cambia todos los valores de ejemplo por valores reales. Variables principales:

- `NODE_ENV=production`
- `SESSION_SECRET`, `SESSION_COOKIE_NAME`, `SESSION_MINUTES`, `TRUST_PROXY_HOPS`
- `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `DB_SSL=true`, `DB_POOL_MAX=2`, `SESSION_DB_POOL_MAX=2`
- `PUBLIC_HTTPS_ORIGIN`, `CORS_ORIGIN`, `FRONTEND_URL` con la misma URL de producción
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`
- `N8N_WEBHOOK_URL`, `N8N_API_BASE_URL`, `N8N_WEBHOOK_AUTH_TOKEN`, `N8N_API_SERVICE_TOKEN`

No agregues valores secretos a `vercel.json`, al código frontend ni al repositorio. Si el secreto OAuth anterior se compartió, revócalo y crea uno nuevo.

## 6. Base de datos MySQL

Importa `schema.production.sql` en una base remota vacía. No ejecutes `schema.sql` sobre una base productiva: contiene datos demo y pasos para reiniciar tablas. El proveedor MySQL debe exigir TLS y permitir conexiones desde Vercel. Un usuario de aplicación con permisos mínimos debe tener acceso a las tablas necesarias, incluida `user_sessions`.

Después crea las cuentas iniciales una sola vez desde un equipo de confianza, con variables locales protegidas y conexión a la base remota, siguiendo `docs/PRODUCCION.md`.

## 7. Google OAuth

Después de la primera publicación, copia el dominio asignado (ej. `https://tu-proyecto.vercel.app`) y actualiza el cliente OAuth de tipo Web:

- Authorized JavaScript origin: `https://tu-proyecto.vercel.app`
- Authorized redirect URI: `https://tu-proyecto.vercel.app/api/auth/google/callback`
- `GOOGLE_REDIRECT_URI` en Vercel debe coincidir exactamente.

Añade tu cuenta a la lista de Test users si la pantalla de consentimiento aún está en modo de pruebas y vuelve a desplegar después de cambiar las variables.

## 8. n8n

Importa `n8n/workflow_raiz_madera.json` en n8n Cloud o un servidor HTTPS independiente. Configura Header Auth en el Webhook (`x-rm-webhook-token` = `N8N_WEBHOOK_AUTH_TOKEN`), Header Auth en las herramientas (`x-service-token` = `N8N_API_SERVICE_TOKEN`) y credencial real en el nodo del modelo. Configura `N8N_WEBHOOK_URL` con la Production URL y `N8N_API_BASE_URL` con el dominio Vercel.

Express envía a n8n la URL base configurada; los nodos HTTP Request Tool construyen los endpoints desde la entrada validada. No pegues credenciales en el JSON del workflow.

## 9. Comprobaciones antes de producción

Desde la raíz del repo:

```bash
node scripts/check-vercel.mjs
node scripts/check-integration.mjs
```

Cuando las dependencias estén instaladas, ejecuta también `npm test` en backend y `npm run build` en frontend. Tras publicar, prueba:

- `https://TU_PROYECTO.vercel.app/`
- `https://TU_PROYECTO.vercel.app/login` después de refrescar la página
- `https://TU_PROYECTO.vercel.app/api/health`
- `https://TU_PROYECTO.vercel.app/api/ready`
- Google OAuth, sesiones/CSRF, permisos por rol, CRUD, pedidos y agente n8n

Vercel Services está en beta y requiere el Framework Preset `Services`. Si no aparece, revisa si tu cuenta/proyecto tiene acceso habilitado. El ZIP no se considera listo para producción hasta que los tests y las conexiones reales pasan.
