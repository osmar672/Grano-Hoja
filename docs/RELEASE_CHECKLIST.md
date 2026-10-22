# Checklist de salida a producción — Raíz & Madera

No marques la aplicación como lista para producción hasta ejecutar todos los puntos aplicables. Los checks estáticos del generador no sustituyen una prueba con servicios activos.

## A. Instalación reproducible

- [ ] Con acceso al registro npm, ejecutar `npm install` dentro de `backend/` y `frontend/`.
- [ ] Revisar los lockfiles recién generados y versionar `backend/package-lock.json` y `frontend/package-lock.json`.
- [ ] En backend, ejecutar `npm run check`, `npm run check:integration`, `npm test`, `npm run audit` y revisar `npm run outdated`.
- [ ] En frontend, ejecutar `npm run audit`, `npm run outdated` y `npm run build`.
- [ ] Corregir las vulnerabilidades moderadas/altas y volver a ejecutar las pruebas, sin `npm audit fix --force` sin revisar cambios incompatibles.

## B. Configuración de producción

- [ ] Servidor Linux con Docker Engine y Docker Compose v2 actualizados.
- [ ] DNS A/AAAA de `PUBLIC_DOMAIN` apunta al servidor; firewall permite TCP 80/443.
- [ ] Copiar `.env.production.example` a `.env.production`; generar secretos distintos y largos para contraseña de MySQL 8.4, rol de app, sesión, las dos credenciales de n8n y las tres cuentas iniciales.
- [ ] `node scripts/check-production-env.mjs .env.production` termina con código 0 y no hay secretos versionados.
- [ ] Confirmar que el Compose de producción no publica el puerto de MySQL 8.4 y usar solo `compose.production.yaml` en producción.
- [ ] Registrar en Google OAuth el callback exacto `https://PUBLIC_DOMAIN/api/auth/google/callback`; completar consentimiento y estado de publicación de Google.
- [ ] Actualizar las dos URLs del workflow n8n a `https://PUBLIC_DOMAIN/api/reportes/...`; configurar `x-service-token` para las herramientas y `x-rm-webhook-token` para el webhook con secretos diferentes.
- [ ] Activar el workflow n8n y configurar `N8N_WEBHOOK_URL` con su URL de producción real.

## C. Despliegue y salud

- [ ] Ejecutar `docker compose --env-file .env.production -f compose.production.yaml up -d --build`.
- [ ] Ejecutar una sola vez el perfil bootstrap para crear las tres cuentas iniciales; proteger inmediatamente las credenciales de administración.
- [ ] `/api/health` devuelve 200; `/api/ready` devuelve 200 y `database: ready`.
- [ ] Ejecutar el smoke test HTTPS de `docs/PRODUCCION.md`; comprobar HSTS, `X-Content-Type-Options` y ausencia de `X-Powered-By`.
- [ ] Probar acceso Google, login, logout, expiración de sesión, bloqueo de cuenta, permisos por rol y CSRF.
- [ ] Probar CRUD, ventas, descuento de stock, conflicto 409, anulación dentro/fuera de 15 minutos y reportes.
- [ ] Probar que n8n genera una sugerencia de reposición, que no modifica datos y que devuelve `{ ok, data, error }`.

## D. Operación segura

- [ ] Configurar y probar backup cifrado; restaurar el backup en una base aislada y medir que el proceso funciona.
- [ ] Definir retención de logs y alertas de errores/login anómalo en el entorno de hosting.
- [ ] Ejecutar OWASP ZAP contra el dominio publicado; revisar hallazgos y corregir antes de aceptar datos reales.
- [ ] Publicar el aviso de privacidad/consentimiento aprobado para la actividad y revisar obligaciones aplicables de la Ley 8968 de Costa Rica.
- [ ] Guardar colección Postman y evidencias de las pruebas; terminar la bitácora y ensayar la demo.

## Estado al generar el ZIP

Verificaciones estáticas: `backend/npm run check`, 11 comprobaciones `check:integration`, sintaxis de 30 archivos JS/JSX, parse de YAML/JSON y shell scripts. La suite de Node ejecutó 12 pruebas correctas, pero la suite completa no terminó porque no se pudo instalar `zod` desde npm en el entorno de generación. No se ejecutaron Docker, MySQL 8.4, build de Vite, OAuth real, n8n ni un dominio HTTPS; estos puntos siguen pendientes.
