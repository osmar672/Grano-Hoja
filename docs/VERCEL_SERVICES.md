# Despliegue con Vercel Services — Grano & Hoja

## Arquitectura y rutas

`vercel.json` declara dos servicios en un único proyecto:

- `backend/`: Express, entrypoint `index.js`, maneja `/api/*`.
- `frontend/`: Vite/React, build `npm run build`, output `dist` y fallback SPA a `index.html`.

El rewrite `/api/(.*)` hacia backend precede al catch-all hacia frontend. React usa `VITE_API_URL` si existe y, por defecto, `/api`. MySQL y n8n son externos; no se declaran bindings entre servicios Vercel para MySQL o n8n: el navegador llama la API pública y Express se comunica con esos proveedores externos.

## Publicación

1. Importa el repositorio completo desde el directorio del proyecto `./`.
2. Selecciona **Framework Preset: Services**.
3. No agregues overrides globales para Install Command, Build Command o Output Directory; las instrucciones están en `vercel.json` por servicio.
4. Añade las variables de `../.env.vercel.example` en Project Settings → Environment Variables, configurando Production/Preview/Development como corresponda.
5. Prepara MySQL 8 accesible externamente con TLS cuando el proveedor lo requiera, importa `schema.production.sql` en una base nueva y confirma que el usuario MySQL tenga solo los permisos necesarios.
6. Configura Google Cloud con callback `https://TU_DOMINIO/api/auth/google/callback` y origen de frontend exacto.
7. Configura n8n por HTTPS: `N8N_WEBHOOK_URL` debe apuntar al webhook oficial activo; `N8N_API_BASE_URL` debe ser el origen público de la API, sin path; los dos tokens deben ser distintos.
8. Ejecuta `node scripts/check-vercel.mjs` y `node scripts/check-integration.mjs`, luego realiza un deployment de prueba y sigue el checklist en `PRODUCCION.md`.

## Variables exactas para revisar en Vercel

`NODE_ENV`, `SESSION_SECRET`, `SESSION_COOKIE_NAME`, `SESSION_MINUTES`, `TRUST_PROXY_HOPS`, `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `DB_SSL`, `DB_POOL_MAX`, `SESSION_DB_POOL_MAX`, `PUBLIC_HTTPS_ORIGIN`, `CORS_ORIGIN`, `FRONTEND_URL`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`, `N8N_WEBHOOK_URL`, `N8N_API_BASE_URL`, `N8N_WEBHOOK_AUTH_TOKEN`, `N8N_API_SERVICE_TOKEN`, `LOGIN_IP_LIMIT`. No definas secretos con prefijo `VITE_`.

`PUBLIC_HTTPS_ORIGIN`, `CORS_ORIGIN` y `FRONTEND_URL` deben concordar con el origen público permitido. `GOOGLE_REDIRECT_URI` debe concordar exactamente con la URI autorizada en Google Cloud. `N8N_API_BASE_URL` debe ser HTTPS en producción y apuntar al dominio del backend público. No reutilices el mismo token para los dos headers.

## Ver logs de `500 FUNCTION_INVOCATION_FAILED`

1. En el Dashboard del proyecto, abre **Logs** desde la navegación lateral.
2. Filtra `Environment: Production`, `Status Code: 500` y la ruta `/api/health` (o la que falle). Establece el intervalo temporal donde reproduciste el error.
3. Abre la entrada y revisa los logs de esa invocación, el Request ID y los mensajes `console.error`. Usa el Request ID para correlacionar la misma petición; no compartas cookies o secretos.
4. Si el fallo ocurrió al construir/publicar, ve a **Deployments → deployment fallido → Build Logs**.
5. Tras modificar variables, crea un deployment nuevo; los cambios no alteran deployments ya publicados.

Con CLI instalada y enlazada al proyecto:

```powershell
vercel logs --level error --since 1h
```

El backend ahora escribe un evento diagnóstico con el nombre de la variable ausente o el tipo de error de configuración sin imprimir su valor. El error de la captura no demuestra por sí solo que una variable concreta falte; los logs son necesarios para determinarlo.

Referencias oficiales actualizadas: [Runtime Logs](https://vercel.com/docs/logs/runtime), [CLI `vercel logs`](https://vercel.com/docs/cli/logs), [Variables de entorno](https://vercel.com/docs/environment-variables).
