# SECURITY.md — Raíz & Madera

Este documento describe la configuración de seguridad para la versión de desarrollo. No equivale a una auditoría independiente ni certifica cumplimiento total de OWASP.

## Implementado

- Sesión del servidor con `express-session` y almacenamiento PostgreSQL mediante `connect-pg-simple`.
- Cookie `rm.sid` con `HttpOnly`, `SameSite=Lax` (para permitir el callback GET de Google OAuth) y `Secure` cuando `NODE_ENV=production`.
- `SESSION_SECRET` obligatorio y de al menos 32 bytes; sesión expira en 30 minutos por defecto y se renueva con actividad.
- Contraseñas guardadas como hashes bcrypt; el script seed no registra contraseñas.
- Rate limiting para login y bloqueo temporal tras cinco intentos fallidos.
- `CORS_ORIGIN` es una lista explícita; no permite `*` con sesiones.
- Helmet en la API: CSP, `X-Content-Type-Options`, protección de clickjacking, `Referrer-Policy`; `Permissions-Policy` restringe sensores innecesarios.
- En producción la API exige `PUBLIC_HTTPS_ORIGIN`, redirige HTTP a HTTPS y activa HSTS; requiere configurar correctamente `TRUST_PROXY` si hay proxy inverso.
- CSRF con token sincronizador aleatorio guardado en sesión para POST/PUT/PATCH/DELETE, validación de Origin y Fetch Metadata; el cliente React obtiene el token y lo manda en `X-CSRF-Token`.
- Middleware de sesión y permisos por rol en endpoints protegidos.
- Validación Zod en IDs, query params y cuerpos con esquemas estrictos.
- Consultas PostgreSQL parametrizadas; ordenamiento dinámico mediante listas permitidas.
- Límites de JSON, mensajes de error controlados y tokens n8n exclusivos de servidor.
- `.env` y dependencias excluidos de Git.

## Roles

| Acción | admin | encargado | caja |
|---|---:|---:|---:|
| Consultar catálogo | Sí | Sí | Sí |
| Crear/editar catálogo y stock | Sí | Sí | No |
| Eliminar productos | Sí | No | No |
| Crear, consultar, confirmar y anular ventas | Sí | Sí | Sí |
| Ver métricas y alertas de stock | Sí | Sí | Sí |
| Leer reporte semanal de ventas | Sí | Sí | Solo token de servicio n8n |
| Usar agente de reposición | Sí | Sí | No |

La tienda es una sola organización compartida; no hay datos aislados por cliente final. Si se añaden múltiples tiendas o cuentas de clientes, habrá que introducir propietario/tenant y filtrar cada consulta por ese ámbito.

## Variables requeridas

Revisa `.env.example`, `backend/.env.example` y `frontend/.env.example`. En particular, crea secretos nuevos para `SESSION_SECRET`, `N8N_WEBHOOK_AUTH_TOKEN` y `N8N_API_SERVICE_TOKEN`; no reutilices el mismo valor entre ellos. Las contraseñas de los tres usuarios se definen localmente en `backend/.env`, nunca en el repositorio.

## Pendiente antes de producción

- Fase 3: el backend tiene Helmet, CSRF y redirect HTTPS configurados. Sigue pendiente configurar certificados TLS, `PUBLIC_HTTPS_ORIGIN`, `TRUST_PROXY` y el origen de API en los encabezados del hosting real. `style-src 'unsafe-inline'` se mantiene por compatibilidad y debe evaluarse para endurecer CSP.
- Fase 4: logger JSON con lista permitida, correlación por `X-Request-Id`, eventos de autenticación y cambios sensibles, pruebas que comprueban omisión de secretos, Dependabot y workflow CI de auditoría. **Pendiente de ejecución local:** `npm audit` real y lockfiles; el registro npm no respondió en el entorno de generación, por lo que no se afirma ausencia de vulnerabilidades. Configurar retención y alertas en el hosting.
- Fase 5: pruebas de integración reales con PostgreSQL, OWASP ZAP, comprobación de cabeceras, prueba de bloqueo de login y revisión manual de permisos.
- Crear usuario PostgreSQL dedicado con privilegios mínimos; no operar la API con el superusuario `postgres` en producción.
- No exponer el puerto PostgreSQL en interfaces públicas; limitar firewall a los puertos necesarios. En `compose.yaml`, el puerto 5432 está publicado para desarrollo local; elimínalo o enlázalo a `127.0.0.1` en producción.
- Configurar copias de seguridad cifradas, retención y prueba de restauración.
- Revisar minimización de datos, aviso de privacidad y consentimiento acorde a la Ley 8968 de Costa Rica antes de guardar información de clientes.
- Valorar segundo factor para cuentas administrativas.

## Verificación local

```powershell
cd backend
npm install
npm run audit
npm run outdated
npm test
npm run check
# Luego revisar también frontend:
cd ../frontend
npm install
npm run audit
npm run outdated
npm run build
```

Login de prueba con `curl` puede requerir guardar la cookie, por ejemplo:

```bash
curl -i -c cookies.txt -H "Content-Type: application/json" -d '{"email":"admin@raizymadera.local","password":"TU_CLAVE_LOCAL"}' http://localhost:3001/api/auth/login
curl -i -b cookies.txt http://localhost:3001/api/productos
```

No pegues contraseñas reales en tickets o bitácoras. Escanea el entorno de pruebas, no un sitio de terceros, con OWASP ZAP. SecurityHeaders.com y Mozilla Observatory solo pueden revisar un sitio públicamente accesible por HTTPS; los resultados dependen de la configuración real del hosting.


## Fase 3 — Cabeceras, CORS, CSRF y HTTPS

- API: Helmet está configurado en `backend/src/app.js` con CSP (`default-src`, `object-src 'none'`, `frame-ancestors 'none'` y fuentes restringidas), HSTS en producción, `Referrer-Policy`, `Permissions-Policy` y `X-Powered-By` desactivado.
- Las mutaciones requieren el token CSRF sincronizador de sesión: `GET /api/auth/csrf` genera/devolverá `{ ok, csrfToken }`; la API exige `X-CSRF-Token` para POST/PUT/PATCH/DELETE. El frontend lo obtiene automáticamente desde `services/api.js`.
- `CORS_ORIGIN` debe contener solo el origen exacto del frontend, separado por comas si hay más de uno; `*` no está permitido.
- En producción define `NODE_ENV=production` y `PUBLIC_HTTPS_ORIGIN=https://tu-dominio-real.example`. La app redirige peticiones HTTP a ese origen configurado; usa certificado TLS válido en el hosting o proxy.
- Si TLS termina en un proxy inverso, configura `TRUST_PROXY=true` únicamente si Express recibe exactamente un proxy confiable. No confíes en cabeceras forwarded desde clientes públicos.
- Para Netlify: el archivo `frontend/public/_headers` es una plantilla activa; sustituye `https://API_ORIGIN_REEMPLAZAR` por el origen HTTPS exacto de tu API antes de publicar. Para Vercel, haz la misma sustitución en `frontend/vercel.json`.
- La API no puede configurar HTTPS por un hosting externo: esa parte se debe completar en el proveedor o proxy del despliegue.

## Google OAuth / creación de cuentas

- La identidad se verifica en el backend con `google-auth-library`, ID token firmado, audiencia esperada, correo verificado, `state`, `nonce` y PKCE S256.
- Scopes mínimos: `openid email profile`; no se accede a Gmail API ni al contenido de la bandeja de entrada.
- Los nuevos registros reciben siempre el rol `caja`; los roles privilegiados no se reciben desde el navegador ni desde Google.
- Una cuenta local existente no se vincula automáticamente por email.
- Variables requeridas: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`, `FRONTEND_URL`. El secreto es exclusivo del backend.
- La cookie de sesión usa `SameSite=Lax` para permitir el callback OAuth de navegación superior y mantiene `HttpOnly`; en producción exige HTTPS para `Secure`. Completar la Fase 3 para las defensas CSRF y el despliegue HTTPS integral.
- En Google Cloud Console registra el URI callback exacto; localhost HTTP solo se utiliza para desarrollo.


## Fase 4 — Dependencias, logs y monitoreo

Consulta `docs/SECURITY_PHASE4.md` para instrucciones reproducibles. La auditoría npm no se pudo completar en el entorno que generó este ZIP; ejecuta `npm install`/`npm run audit` por separado en backend y frontend, revisa los resultados, guarda los `package-lock.json` y no uses `npm audit fix --force` sin revisar los cambios. El CI de `.github/workflows/security.yml` ejecuta análisis en push/PR y semanalmente.


## Estado Fase 4 — Dependencias, logs y monitoreo

| Medida | Estado | Evidencia / pendiente |
|---|---|---|
| Logs JSON con lista permitida y sin secretos | Implementada en código | `backend/src/utils/logger.js` |
| ID de correlación por solicitud | Implementada en código | Header `X-Request-Id` |
| Eventos de login, denegación de permisos y cambios sensibles | Implementada en código | Eventos `auth.*`, `authz.*`, `audit.*` |
| Prueba de que el logger no imprime credenciales/PII | Implementada en tests unitarios | `backend/tests/logger.test.js` |
| Dependabot semanal | Configurado | `.github/dependabot.yml`; se activa al subirlo al repositorio |
| CI con auditoría y tests | Configurado | `.github/workflows/security.yml` |
| `npm audit` real para este ZIP | Pendiente | El registro npm agotó el tiempo de espera al generar la entrega |
| Lockfiles versionados | Pendiente | Ejecuta `npm install` por carpeta y revisa/añade ambos `package-lock.json` |
| Alertas y retención en producción | Pendiente | Configúralas en el hosting/gestor de logs |

En GitHub, después de hacer `git push`, revisa Settings → Advanced Security y activa **Dependabot alerts** y **Dependabot security updates** si están disponibles en el repositorio. La revisión semanal crea pull requests; no acepta automáticamente cambios de versión por ti.
