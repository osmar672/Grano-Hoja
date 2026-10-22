# Producción — Grano & Hoja

## Arquitectura recomendada en Vercel

El repositorio utiliza Vercel Services con `backend/` (Express) para `/api/*` y `frontend/` (Vite) para el resto de rutas. MySQL y n8n son servicios externos; deben ser accesibles desde el backend y configurar TLS/firewall según el proveedor. `compose.production.yaml` es una alternativa contenerizada distinta que no se ha validado en ejecución dentro de esta auditoría.

## Variables de producción

Revisa `.env.production.example` y `scripts/check-production-env.mjs`. Para Vercel, revisa `.env.vercel.example` y configura en **Project → Settings → Environment Variables**:

- Sesión/origen: `NODE_ENV=production`, `SESSION_SECRET` (mínimo 32 bytes), `SESSION_COOKIE_NAME`, `SESSION_MINUTES`, `TRUST_PROXY_HOPS`, `PUBLIC_HTTPS_ORIGIN`, `CORS_ORIGIN`, `FRONTEND_URL`.
- MySQL: `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `DB_SSL`, `DB_POOL_MAX`, `SESSION_DB_POOL_MAX`. Si el proveedor exige CA, configura `DB_SSL_CA_FILE` mediante un mecanismo seguro compatible con el despliegue.
- Google OAuth: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI` (idéntica al callback autorizado en Google Cloud).
- n8n: `N8N_WEBHOOK_URL`, `N8N_API_BASE_URL`, `N8N_WEBHOOK_AUTH_TOKEN`, `N8N_API_SERVICE_TOKEN` (tokens distintos).
- Rate limit: `LOGIN_IP_LIMIT`.

`SEED_*` se usan por el script local de inicialización/usuarios y no se necesitan en Vercel si no ejecutas allí el script de seed. No uses variables `VITE_*` para secretos: se envían al navegador.

Las variables de entorno cambiadas en Vercel solo se aplican a deployments nuevos. Revisa **Production**, **Preview** y **Development** por separado según el entorno deseado.

## Diagnóstico del 500 `FUNCTION_INVOCATION_FAILED`

1. Abre Vercel Dashboard → proyecto → **Logs**. Filtra `Environment=Production`, status `500`, ruta `/api/health` o la ruta que falla, y nivel `error`/`fatal`. Abre la entrada para ver el Request ID y los mensajes de esa invocación.
2. Para errores de build/instalación, abre **Deployments** → el deployment fallido → **Build Logs**. Los errores de compilación no son lo mismo que una excepción de runtime.
3. Revisa los mensajes estructurados `config.startup_failed` o errores de configuración; el backend registra el nombre de la variable y el tipo/motivo, nunca su valor.
4. Confirma las variables de la lista anterior, la URL de MySQL/TLS y el callback de Google. No publiques logs con tokens, cookies o URLs que incluyan credenciales.
5. Después de cambiar variables, vuelve a desplegar y prueba `GET https://TU_DOMINIO/api/health` y `GET https://TU_DOMINIO/api/ready`. El primero prueba que la función responde; el segundo también comprueba acceso a MySQL.

También puedes consultar logs recientes mediante Vercel CLI, tras enlazar la CLI al proyecto:

```powershell
vercel logs --level error --since 1h
```

Referencias oficiales: [Runtime Logs](https://vercel.com/docs/logs/runtime), [Vercel CLI logs](https://vercel.com/docs/cli/logs), [Environment Variables](https://vercel.com/docs/environment-variables).

## Datos y migraciones

- `schema.production.sql` se usa únicamente para inicializar una base nueva sin datos demo.
- Para una base existente, respáldala antes de ejecutar migraciones aditivas. `backend/migrations/004_insumos_recetas.sql` crea insumos, recetas y movimientos y ajusta la restricción de categorías; requiere esquema anterior compatible.
- No ejecutes `schema.sql` sobre datos de producción: contiene `DROP TABLE` y datos demo.
- Comprueba restauración de backups, permisos MySQL mínimos y red/TLS antes de abrir el servicio al público.

## Verificación local disponible

```powershell
node scripts/check-vercel.mjs
node scripts/check-integration.mjs
Push-Location backend
npm run check
npm test
Pop-Location
Push-Location frontend
$env:VITE_API_URL = '/api'
npm run build
Pop-Location
```

Los chequeos estáticos y las pruebas backend se han ejecutado con los módulos disponibles; la instalación limpia/build online, Vercel real, MySQL real, n8n y Google OAuth requieren verificación en el ambiente de despliegue.
