# Estado de validación — Raíz & Madera

## Revisiones realizadas al preparar este ZIP

- Se revisó el esquema SQL, las rutas de API y los servicios de inventario/ventas respecto al nuevo dominio.
- Se incluyó un test de esquemas para categorías, existencias, IDs, login, pagos, validación anti-HTML y autorización por rol.
- Se comprobaron estructuralmente los JSON del workflow y la colección Postman durante la generación del ZIP.
- La interfaz React quedó adaptada al catálogo de plantas, muebles y decoración; se revisaron imports relativos y sintaxis JSX/JS con un parser estático.

## Pendiente de verificación en tu computadora

- `npm install`, `npm test`, `npm run check` y `npm run build` con dependencias reales.
- Arranque de PostgreSQL, carga de `schema.sql`, sesiones y seed de usuarios.
- Casos transaccionales simultáneos, stock insuficiente y anulación a los 16 minutos.
- Importación/ejecución real del workflow con credencial propia de modelo y n8n accesible desde la API.
- `npm audit`, OWASP ZAP y comprobación de HTTPS/cabeceras al desplegar.

Esta documentación no declara una prueba como pasada si no se ejecutó en un entorno funcional.


## Actualización: login y registro con Google

- [x] Se añadió flujo OAuth del lado del servidor con `state`, `nonce`, PKCE S256 y verificación de correo/ID token.
- [x] Se añadieron botones de Google para acceder y crear cuenta en `/login`.
- [x] Registro nuevo se limita al rol `caja`.
- [x] Variables de Google documentadas solo en backend `.env.example`.
- [x] Migración 002 y soporte en `schema.sql` para identificadores Google.
- [ ] Pendiente: configurar las credenciales OAuth reales en Google Cloud Console y probar el callback en el equipo local; esas credenciales no pueden generarse automáticamente.


## Actualización — Fase 3 de seguridad (21-10-2026)

- Añadido Helmet, CSP en las respuestas de la API, `Permissions-Policy`, y redirect HTTPS/HSTS condicionado a producción.
- Añadida protección CSRF sincronizadora para POST/PUT/PATCH/DELETE, validación de Origin y Fetch Metadata; el cliente React adjunta `X-CSRF-Token`.
- Añadidas plantillas de cabeceras para Netlify (`frontend/public/_headers`) y Vercel (`frontend/vercel.json`); se debe reemplazar `API_ORIGIN_REEMPLAZAR` antes del despliegue.
- Verificación local en este entorno: `node --check` para fuentes JS seleccionadas y `node --test tests/security-phase3.test.js`: 5/5 pruebas de la protección CSRF pasaron.
- Pendiente: instalación integral de dependencias (npm install excedió el tiempo límite en este entorno), compilación Vite, pruebas con PostgreSQL/navegador, comprobar cabeceras desde el hosting real y configurar TLS/proxy/dominio definitivo.


## Actualización — Panel de administración

- Añadida la página React `/admin`, visible solo para el rol `admin`, con resumen, accesos rápidos, gestión de usuarios, filtros, cambio de rol/estado, restablecimiento de contraseñas y actividad reciente.
- Añadidos `GET /api/admin/overview`, `GET /api/admin/users`, `POST /api/admin/users`, `PATCH /api/admin/users/:id` y `GET /api/admin/audit`; todos detrás de `requireAuth` y `requireRole('admin')`.
- Añadido `backend/migrations/003_admin_tools.sql` para bases existentes y la tabla `admin_audit_events` a `schema.sql` para instalaciones nuevas. Las acciones de administración se escriben en auditoría dentro de la misma transacción de las operaciones de usuario; catálogo y ventas añaden eventos best-effort sin interrumpir una operación ya confirmada.
- Se protege la última cuenta admin activa, se bloquea el cambio de rol/estado de la propia cuenta y se evita exponer secretos en los metadatos de auditoría.
- Verificación ejecutada aquí: `npm run check` validó sintaxis de 43 archivos del backend; `node --test tests/admin-rules.test.js` pasó 3/3; el parser de TypeScript transpuso 30 archivos JS/JSX del frontend sin errores sintácticos; JSON de Postman validado.
- Pendiente: instalar dependencias para ejecutar la suite completa y el build real de Vite; aplicar la migración en PostgreSQL y probar la página/operaciones con una sesión admin real. En este entorno el test conjunto no pudo importar `zod` porque las dependencias npm no están instaladas.
- La ejecución de `npm test` completa en el entorno de generación se detuvo en `tests/validation.test.js` porque no está instalado el paquete `zod`; los 12 tests ejecutados sin esa dependencia pasaron. Ejecuta `npm install` en backend antes de repetir la suite completa.
