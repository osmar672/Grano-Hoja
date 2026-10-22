# Despliegue de producción — Raíz & Madera

La ruta de producción soportada en este repositorio es **un único dominio HTTPS** servido por Caddy, con Nginx para la SPA y proxy hacia Express. Esto evita exponer tokens en React y mantiene cookie, CSRF y OAuth en el mismo origen. El frontend se compila con `VITE_API_URL=/api`, nunca con una URL `localhost`.

## Antes de desplegar

- Servidor Linux con Docker Engine y Docker Compose v2.
- Un dominio público con registros DNS A/AAAA apuntando al servidor y puertos TCP 80/443 accesibles desde Internet (y UDP 443 opcional para HTTP/3).
- Credenciales OAuth de Google de tipo Web application con redirect URI `https://TU_DOMINIO/api/auth/google/callback`.
- Instancia n8n por HTTPS con la credencial Header Auth que usa `x-rm-webhook-token`, más credencial `x-service-token` distinta para las herramientas que consultan la API.
- Backups, retención de logs y monitorización gestionados por el operador.

## Configuración

1. Copia `.env.production.example` a `.env.production`. Ese archivo está ignorado por Git; jamás lo subas.
2. Genera contraseñas distintas usando `node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"` para `APP_DB_PASSWORD`, y secretos hex usando `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"` para `SESSION_SECRET` y los dos tokens de n8n.
3. Rellena el dominio sin protocolo en `PUBLIC_DOMAIN`. Configura `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` y registra exactamente el callback HTTPS en Google Cloud. El Compose de producción deriva `FRONTEND_URL`, `CORS_ORIGIN`, `PUBLIC_HTTPS_ORIGIN` y `GOOGLE_REDIRECT_URI` automáticamente de `PUBLIC_DOMAIN`. Registra en Google Cloud exactamente `https://TU_DOMINIO/api/auth/google/callback`; `scripts/check-production-env.mjs` valida los secretos, el dominio y los endpoints externos.
4. Ejecuta desde la raíz: `node scripts/check-production-env.mjs .env.production`.
5. Despliega: `docker compose --env-file .env.production -f compose.production.yaml up -d --build`.
6. Crea las cuentas iniciales **una sola vez** en un contenedor temporal de bootstrap: `docker compose --env-file .env.production -f compose.production.yaml --profile bootstrap run --rm seed`. Revisa los logs del comando; no copies credenciales en consola compartida.
7. En Google Cloud Console añade el callback `https://TU_DOMINIO/api/auth/google/callback` y autoriza las cuentas de test si la app OAuth sigue en modo pruebas.
8. En `n8n/workflow_raiz_madera.json`, sustituye `https://TU_DOMINIO/api/reportes/...` por el dominio real en ambos nodos HTTP Request Tool, selecciona la credencial Header Auth que envía `x-service-token` con `N8N_API_SERVICE_TOKEN`, y configura el Webhook Header Auth con `x-rm-webhook-token` y `N8N_WEBHOOK_AUTH_TOKEN`. Activa el workflow y copia su Production URL a `N8N_WEBHOOK_URL`.
9. Comprueba `https://TU_DOMINIO/api/health` y `https://TU_DOMINIO/api/ready`, y ejecuta `BASE_URL=https://TU_DOMINIO node scripts/production-smoke.mjs` desde bash o define `BASE_URL` en PowerShell antes de ejecutar el script.

## ¿Qué protege el despliegue?

- Caddy gestiona certificados/HTTPS y redirección HTTP a HTTPS.
- Caddy/Nginx aplican cabeceras de seguridad al frontend y pasan el esquema HTTPS al backend.
- MySQL 8.4 no publica ningún puerto del host en `compose.production.yaml`.
- El backend usa una cuenta MySQL 8.4 de aplicación con permisos DML y auto-incrementos, separada del superusuario de bootstrap.
- Frontend, backend y MySQL 8.4 están en redes de contenedores separadas por función. Los contenedores frontend/backend corren sin root, en filesystem de solo lectura, sin capacidades Linux y con `no-new-privileges`.
- Sesiones de servidor tienen cookie `Secure` en producción y el backend valida las peticiones mutables con token CSRF.
- Health liveness `/api/health` y readiness con MySQL 8.4 `/api/ready` son endpoints independientes.

## Backups y restauración

Requisito: instala `gpg` en el host y elige una frase de cifrado fuerte fuera del repositorio. `BACKUP_PASSPHRASE='...' bash deploy/scripts/backup-mysql.sh` genera un dump MySQL 8.4 cifrado con AES-256. Protege el directorio de backups, cópialo a almacenamiento externo cifrado y prueba una restauración de forma periódica en una base aislada. No guardes la frase junto al backup. La ejecución de backups/restauración debe monitorizarse; el archivo de script por sí solo no constituye un backup probado.

## Actualizaciones

Actualiza imágenes base de forma rutinaria, revisa Dependabot y ejecuta los workflows. Sin `package-lock.json`, `npm install` puede resolver dependencias transitivas distintas entre builds; la primera tarea del equipo al tener acceso al registro npm es ejecutar `npm install` en backend y frontend, comprobar build/pruebas, revisar `npm audit` y versionar los dos lockfiles. No uses `npm audit fix --force` sin probar compatibilidad.

## Limitaciones

Esta configuración es un punto de despliegue reproducible, no certifica que la infraestructura esté operativa. El operador debe validar DNS, credenciales OAuth/n8n, reglas de firewall, almacenamiento, backups, alertas y escaneos externos (por ejemplo OWASP ZAP) antes de aceptar clientes reales. `schema.production.sql` no contiene productos, ventas ni otros datos de demostración.
