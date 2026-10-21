# SECURITY.md — Raíz & Madera

Este documento describe la configuración de seguridad para la versión de desarrollo. No equivale a una auditoría independiente ni certifica cumplimiento total de OWASP.

## Implementado

- Sesión del servidor con `express-session` y almacenamiento PostgreSQL mediante `connect-pg-simple`.
- Cookie `rm.sid` con `HttpOnly`, `SameSite=Strict` y `Secure` cuando `NODE_ENV=production`.
- `SESSION_SECRET` obligatorio y de al menos 32 bytes; sesión expira en 30 minutos por defecto y se renueva con actividad.
- Contraseñas guardadas como hashes bcrypt; el script seed no registra contraseñas.
- Rate limiting para login y bloqueo temporal tras cinco intentos fallidos.
- `CORS_ORIGIN` es una lista explícita; no permite `*` con sesiones.
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

- Fase 3: CSP/Helmet, HSTS, cabeceras finales, protección CSRF según el patrón de despliegue y HTTPS real en proxy/hosting. En producción se necesita `NODE_ENV=production`, certificado TLS válido y configuración coherente de `TRUST_PROXY`.
- Fase 4: ejecutar `npm audit` en backend/frontend, fijar versiones confirmadas, automatizar escaneo con Dependabot y definir logs/alertas sin tokens ni datos personales.
- Fase 5: pruebas de integración reales con PostgreSQL, OWASP ZAP, comprobación de cabeceras, prueba de bloqueo de login y revisión manual de permisos.
- Crear usuario PostgreSQL dedicado con privilegios mínimos; no operar la API con el superusuario `postgres` en producción.
- No exponer el puerto PostgreSQL en interfaces públicas; limitar firewall a los puertos necesarios.
- Configurar copias de seguridad cifradas, retención y prueba de restauración.
- Revisar minimización de datos, aviso de privacidad y consentimiento acorde a la Ley 8968 de Costa Rica antes de guardar información de clientes.
- Valorar segundo factor para cuentas administrativas.

## Verificación local

```powershell
cd backend
npm audit
npm test
npm run check
```

Login de prueba con `curl` puede requerir guardar la cookie, por ejemplo:

```bash
curl -i -c cookies.txt -H "Content-Type: application/json" -d '{"email":"admin@raizymadera.local","password":"TU_CLAVE_LOCAL"}' http://localhost:3001/api/auth/login
curl -i -b cookies.txt http://localhost:3001/api/productos
```

No pegues contraseñas reales en tickets o bitácoras. Escanea el entorno de pruebas, no un sitio de terceros, con OWASP ZAP. SecurityHeaders.com y Mozilla Observatory solo pueden revisar un sitio públicamente accesible por HTTPS; los resultados dependen de la configuración real del hosting.


## Google OAuth / creación de cuentas

- La identidad se verifica en el backend con `google-auth-library`, ID token firmado, audiencia esperada, correo verificado, `state`, `nonce` y PKCE S256.
- Scopes mínimos: `openid email profile`; no se accede a Gmail API ni al contenido de la bandeja de entrada.
- Los nuevos registros reciben siempre el rol `caja`; los roles privilegiados no se reciben desde el navegador ni desde Google.
- Una cuenta local existente no se vincula automáticamente por email.
- Variables requeridas: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`, `FRONTEND_URL`. El secreto es exclusivo del backend.
- La cookie de sesión usa `SameSite=Lax` para permitir el callback OAuth de navegación superior y mantiene `HttpOnly`; en producción exige HTTPS para `Secure`. Completar la Fase 3 para las defensas CSRF y el despliegue HTTPS integral.
- En Google Cloud Console registra el URI callback exacto; localhost HTTP solo se utiliza para desarrollo.
