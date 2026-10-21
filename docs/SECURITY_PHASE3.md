# Fase 3 — Cabeceras, CORS, CSRF y HTTPS

## Implementado en código

- Helmet en Express: CSP restrictiva para respuestas de la API, protección frente a clickjacking, nosniff, política de referente y cabeceras de seguridad predeterminadas.
- `X-Powered-By` desactivado y `Permissions-Policy` explícita para cámara, micrófono y geolocalización.
- HSTS activado solo en `NODE_ENV=production` (`max-age=15552000`, sin `includeSubDomains` ni `preload` para no afectar subdominios que aún no tengan TLS).
- La API obliga a configurar `PUBLIC_HTTPS_ORIGIN` en producción y redirige solicitudes HTTP a ese origen, no al host proporcionado por la petición.
- CORS con lista blanca `CORS_ORIGIN`; no se permite `*`, se limita la lista de métodos y se declara `X-CSRF-Token`.
- CSRF con patrón de token sincronizador: token aleatorio almacenado en la sesión, token enviado por header, validación de Origin y `Sec-Fetch-Site` como defensa en profundidad.
- El cliente web adquiere el token de `GET /api/auth/csrf` y lo adjunta a `POST`, `PUT`, `PATCH` y `DELETE`. Se invalida su caché tras login/logout, porque esas operaciones pueden regenerar/destruir la sesión.
- La colección de Postman obtiene un token antes de cada mutación.

## Configuración local

1. `backend/.env` debe contener `CORS_ORIGIN=http://localhost:5173`, `NODE_ENV=development` y un `SESSION_SECRET` aleatorio de al menos 32 bytes.
2. Reinicia la API después de cambiar variables; ejecuta `cd backend; npm install; npm test; npm run check; npm run dev`.
3. Arranca React y comprueba login/logout, crear/editar/eliminar producto y crear/confirmar/anular venta.
4. Un POST sin `X-CSRF-Token` debe responder `403`. La colección Postman obtiene el token automáticamente.
5. En local no se aplica redirect HTTPS ni HSTS, para que `http://localhost` siga funcionando.

## Configuración de producción — requisito de despliegue

1. Publica frontend y API detrás de HTTPS con certificado válido.
2. Define `NODE_ENV=production`, `PUBLIC_HTTPS_ORIGIN=https://api.tu-dominio.example`, `CORS_ORIGIN=https://app.tu-dominio.example`, `SESSION_COOKIE_NAME=rm.sid` y el resto de secretos en un gestor de secretos.
3. Si un proxy termina TLS delante de Express, define `TRUST_PROXY=true` solo cuando hay exactamente un proxy de confianza entre Internet y Express. Configura el proxy para sobrescribir `X-Forwarded-Proto` y `X-Forwarded-For`; no aceptes esas cabeceras directamente desde usuarios.
4. Sustituye `https://API_ORIGIN_REEMPLAZAR` en los encabezados para Netlify (`frontend/public/_headers`) o Vercel (`frontend/vercel.json`) por el origen HTTPS exacto de la API. Configura lo equivalente si utilizas otro hosting.
5. Verifica en las herramientas de desarrollador que la cookie de sesión tenga `Secure`, `HttpOnly` y `SameSite=Lax`, que HSTS solo se envíe por HTTPS y que CSP no bloquee recursos propios.
6. `style-src 'unsafe-inline'` se conserva temporalmente por compatibilidad con estilos dinámicos existentes. Antes de producción de alta seguridad, migra estilos inline a clases CSS y quita esa excepción.

## Pruebas manuales en PowerShell

En desarrollo, con backend encendido, prueba primero la respuesta y cabeceras:

```powershell
curl.exe -i http://localhost:3001/api/health
curl.exe -i -H "Origin: http://localhost:5173" http://localhost:3001/api/health
```

Prueba que la mutación sin token se rechace:

```powershell
curl.exe -i -X POST http://localhost:3001/api/auth/logout -H "Content-Type: application/json" -d "{}"
```

Debe rechazarse por token CSRF ausente/inválido (normalmente `403` antes de comprobar si hay sesión). Para probar un flujo válido manteniendo cookie y token:

```powershell
$web = New-Object Microsoft.PowerShell.Commands.WebRequestSession
$csrf = Invoke-RestMethod -Method Get -Uri 'http://localhost:3001/api/auth/csrf' -WebSession $web
$headers = @{ 'X-CSRF-Token' = $csrf.csrfToken; 'Origin' = 'http://localhost:5173' }
# Reemplaza correo y clave por los valores locales que configuraste; no pegues esas claves en bitácoras.
Invoke-RestMethod -Method Post -Uri 'http://localhost:3001/api/auth/login' -WebSession $web -Headers $headers -ContentType 'application/json' -Body '{"email":"admin@raizymadera.local","password":"TU_CLAVE_LOCAL"}'
```

Si autentica correctamente, prueba un POST protegido usando la misma sesión y token actualizado obtenido desde `GET /api/auth/csrf` después del login.

## Estado

- [x] Helmet en API y políticas de cabecera.
- [x] CORS sin wildcard y header CSRF permitido.
- [x] Token CSRF asociado a sesión para métodos mutables.
- [x] Redirección HTTPS de producción configurada en código.
- [x] HSTS condicionado a producción.
- [x] Plantillas de cabeceras para Netlify y Vercel.
- [ ] Certificado TLS, dominio real, `PUBLIC_HTTPS_ORIGIN`, `CORS_ORIGIN` y proxy configurados para el hosting final.
- [ ] CSP probada con el dominio real; quitar `unsafe-inline` cuando no rompa la interfaz.
- [ ] Pruebas de navegador/Postman repetidas en equipo de desarrollo con dependencias instaladas.

No marcar producción como terminada hasta verificar el despliegue real.
