> Documento histórico, escrito cuando el proyecto se llamaba Raíz & Madera.

# Fase 4 — Dependencias, logs y monitoreo

## Implementado en este cambio

- Logger estructurado JSON con lista permitida de campos; descarta por diseño correos, contraseñas, cookies, tokens, cabeceras, cuerpos y mensajes de error arbitrarios.
- Middleware de peticiones que asigna `X-Request-Id` nuevo generado por el servidor y registra método, ruta sin query string, estado, duración y rol/ID interno si ya está autenticado.
- Eventos de auditoría para login correcto/incorrecto, logout, intentos de acceso denegado, creación/edición/eliminación de productos, ventas creadas/confirmadas/anuladas y uso del asistente. Se registran metadatos mínimos; no se incluyen cantidades monetarias, correos ni prompt del agente.
- Errores 5xx con mensaje genérico al cliente y log correlacionable mediante `X-Request-Id`; no se registran stack traces, SQL ni mensajes libres del driver.
- `npm run check` revisa los archivos JavaScript de `backend/src`, `backend/scripts` y `backend/tests`.
- Scripts `npm run audit`, `npm run audit:high`, `npm run audit:fix` y `npm run outdated` en backend y frontend.
- `.github/dependabot.yml` revisa semanalmente dependencias npm de backend/frontend, GitHub Actions y Docker Compose.
- `.github/workflows/security.yml` ejecuta semanalmente y en push/PR auditoría npm, verificación de sintaxis, pruebas unitarias y build del frontend.
- Pruebas unitarias que verifican que el logger conserva los campos de auditoría autorizados y omite valores sensibles.

## Resultados de la inspección estática

- Revisión de los manifiestos: no hay una dependencia directa claramente sobrante a partir de los imports y usos observados.
- El logger usa APIs nativas de Node.js para no añadir otra dependencia de logging.
- En el ZIP recibido no existen `package-lock.json`. Sin lockfiles, las instalaciones no son reproducibles y Dependabot/CI no pueden comparar exactamente el mismo árbol transitive de producción.
- Intenté generar el lockfile con `npm install --package-lock-only --ignore-scripts --no-fund --no-audit`, pero el registro npm no respondió antes del límite de tiempo de este entorno. Por lo tanto, **no se obtuvo un resultado válido de `npm audit` en este entorno** y no se afirma que las dependencias estén libres de vulnerabilidades ni se puede certificar el estado de mantenimiento/abandono de cada paquete con esta ejecución.

## Completar la auditoría de dependencias en Windows

Desde la raíz del repositorio, ejecuta cada grupo de comandos; se generará un lockfile para cada aplicación:

```powershell
cd backend
npm install
npm run audit
npm run outdated
npm run check
npm test
```

Después, en otra terminal desde la raíz:

```powershell
cd frontend
npm install
npm run audit
npm run outdated
npm run build
```

Revisa los resultados de `npm audit`. Si hay avisos, primero prueba una corrección compatible:

```powershell
npm audit fix
npm run check
npm test
```

Haz esto por separado en `backend` y `frontend`, vuelve a ejecutar sus pruebas y revisa el diff antes de aceptar cambios. **No uses `npm audit fix --force` sin revisar las actualizaciones mayores y probar compatibilidad.** Guarda ambos `package-lock.json` en Git después de comprobarlos. Luego cambia los workflows de `npm install` a `npm ci` para instalaciones reproducibles.

## Logs y retención

- En desarrollo, los logs estructurados salen por stdout/stderr para mostrarse en terminal.
- En producción, el gestor de procesos, contenedor o plataforma debe recoger stdout/stderr, limitar acceso y definir retención. No se guardan en archivos locales por defecto.
- Alertar ante: oleadas de `auth.login_rejected`, múltiples `authz.access_denied`, errores HTTP 5xx sostenidos, `database.pool_error` repetidos y fallos continuos del asistente. Usa `X-Request-Id` para correlacionar una respuesta con un log.
- No registrar cuerpos de peticiones, cookies, encabezados de autorización, tokens CSRF, credenciales Google, `DB_PASSWORD`, `DB_HOST` o detalles de conexión MySQL, correos o contenido del prompt del agente.

## Pendientes

- [ ] Ejecutar `npm audit` desde un equipo con acceso al registro npm y revisar la salida real de backend/frontend.
- [ ] Generar y versionar `backend/package-lock.json` y `frontend/package-lock.json`.
- [ ] Revisar informes de GitHub/Dependabot y corregir vulnerabilidades reportadas sin romper compatibilidad.
- [ ] Configurar retención, acceso y alertas en el proveedor del despliegue.
- [ ] Probar que eventos de login fallido, permisos denegados y mutaciones aparecen sin información secreta.
- [ ] Confirmar el estado de mantenimiento de los paquetes mediante páginas oficiales/repositorios cuando el registro esté accesible.

## Complemento: bitácora persistente del panel de administración

El panel `/admin` registra en `admin_audit_events` altas/cambios de usuarios, operaciones de catálogo y eventos del flujo de ventas. La bitácora usa una lista permitida de metadatos y no contiene contraseñas, tokens ni correos. Aplica `backend/migrations/003_admin_tools.sql` en bases existentes.
