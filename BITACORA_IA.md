> **Estado actual del repositorio:** la versión más reciente usa MySQL 8.4 (`mysql2/promise` y `express-mysql-session`). Algunas entradas anteriores de esta bitácora registran la etapa previa con PostgreSQL y se conservan como historial de decisiones, no como instrucciones actuales.

# BITÁCORA DE USO DE IA — Raíz & Madera

Esta bitácora registra el proceso del proyecto. Las entradas originales del prototipo eran para la cafetería Grano & Hoja; el prompt final de transformación cambió explícitamente el dominio a una tienda de plantas, muebles y decoración. La documentación y el código de esta versión deben tomarse como la base actual.

## 1. Diseño inicial de la interfaz

**Prompt usado:** Rediseña la interfaz existente con temática de bosque, verdes profundos, crema, motivos botánicos, transiciones sutiles y soporte para reducir movimiento, sin añadir librerías de interfaz.

**Qué devolvió la IA:** identidad visual, navegación lateral adaptable, componentes con animación de entrada y estilos propios.

**Qué corregí o rechacé:**


## 2. Autenticación y secretos

**Prompt usado:** Audita la aplicación, crea un login con la misma estética y aplica autenticación segura con hashes, sesiones persistentes, bloqueo de login y secretos por variables de entorno; trabaja por fases.

**Qué devolvió la IA:** login React, sesiones server-side PostgreSQL, hashes bcrypt, cookie HttpOnly/SameSite, seed de cuentas por `.env` y documentación de seguridad.

**Qué corregí o rechacé:**


## 3. Control de acceso y validación

**Prompt usado:** Implementa permisos por rol en el backend, validación de cuerpos, IDs y filtros con Zod y protege el acceso al asistente de n8n, sin adelantar otras fases de seguridad.

**Qué devolvió la IA:** middleware de roles, validadores estrictos, pruebas de esquemas y un proxy autenticado que mantiene los tokens de n8n en el servidor.

**Qué corregí o rechacé:**


## 4. Cambio de marca y modelo de negocio

**Prompt usado:** Transformar el proyecto Grano & Hoja en Raíz & Madera, una tienda de plantas, muebles y decoración; conservar el logo botánico aprobado, la paleta verde bosque/crema, las animaciones y las medidas de seguridad; adaptar el modelo de negocio y entregar ZIP.

**Qué devolvió la IA:** nuevo esquema de productos con categoría, precio y stock; ventas con detalle histórico, descuentos de existencias al confirmar, devolución del stock al anular dentro del plazo, panel de ventas, reportes de reposición y actualización de textos e interfaz.

**Qué corregí o rechacé:**


## 5. Adaptación del modelo PostgreSQL

**Prompt usado:** Sustituir el esquema de receta e insumos de cafetería por inventario unitario de plantas, muebles y decoración, manteniendo usuarios, sesiones, productos, pedidos, líneas históricas, restricciones e índices.

**Qué devolvió la IA:** `schema.sql` con cuentas internas, sesiones, catálogo, pedidos y `pedido_items`; artículos de muestra de las tres categorías y ventas de ejemplo de la última semana.

**Qué corregí o rechacé:**


## 6. Reglas transaccionales de inventario

**Prompt usado:** Al confirmar una venta, agrupar cantidades por producto, bloquear productos en orden de ID con `SELECT ... FOR UPDATE`, validar stock suficiente, descontar dentro de `BEGIN/COMMIT/ROLLBACK`; al anular dentro de 15 minutos, devolver cantidades en una transacción.

**Qué devolvió la IA:** servicio de pedidos con bloqueos de fila, errores `409` ante stock insuficiente/transición inválida/anulación vencida y preservación del precio al momento de la venta.

**Qué corregí o rechacé:**


## 7. Asistente de reposición n8n

**Prompt usado:** Crear un agente de reposición para una tienda de plantas, muebles y decoración. Debe consultar stock inferior al mínimo y ventas de los últimos siete días, emitir JSON estricto `{ ok, data, error }` y no modificar inventario.

**Qué devolvió la IA:** workflow exportable sin credenciales, herramientas HTTP de lectura y sugerencias justificadas por stock actual, mínimo y movimiento de ventas. La API actúa como proxy autenticado.

**Qué corregí o rechacé:**


## 8. Pruebas y documentación final

**Prompt usado:** Actualiza README, colección Postman, pruebas de validación, arquitectura, decisiones de esquema y documentación de seguridad para la nueva marca, diferenciando verificaciones estáticas de pruebas de ejecución reales.

**Qué devolvió la IA:** documentación, una colección Postman de flujo feliz y checklist de pruebas manuales. Se indica que el proyecto debe probarse con PostgreSQL/n8n reales antes de producción.

**Qué corregí o rechacé:**

## 9. Revisión final de inventario y pruebas de colección

**Prompt usado:** Actualiza la colección Postman para el modelo de tienda de plantas, muebles y decoración y muestra todo el inventario en la vista Inventario con alerta por debajo del mínimo.

**Qué devolvió la IA:** colección Postman nueva con login por rol, catálogo, reportes, CRUD, venta disponible, doble confirmación 409, venta sin stock 409 y logout; la vista Inventario ahora lista todos los artículos y marca los que están por debajo del mínimo.

**Qué corregí o rechacé:**



## Prompt: Registro de usuario e inicio de sesión con Google

**Prompt usado:** Añadir al login una opción para crear un nuevo usuario y pedir autenticación con Gmail/Google, manteniendo el diseño botánico y las medidas de seguridad.

**Qué devolvió la IA:** Botones de iniciar sesión y crear cuenta mediante Google OAuth 2.0; callback backend con state, nonce y PKCE S256; verificación del ID token y del correo; cuenta nueva con rol inicial `caja`; migración de PostgreSQL y pasos de configuración en Google Cloud Console.

**Qué corregí o rechacé:**

- ________________________________________________________________


## Registro — Fase 3 de seguridad

**Prompt utilizado:** aplicar cabeceras HTTP de seguridad, CORS estricto, CSRF y redirección HTTPS de producción a Raíz & Madera, preservando el login local y Google OAuth.

**Qué devolvió la IA:** se añadió Helmet con CSP y cabeceras, `Permissions-Policy`, HSTS y redirección HTTPS condicionados a producción, un token CSRF sincronizador almacenado en sesión, adquisición automática del token desde `frontend/src/services/api.js`, actualización de Postman y plantillas de cabeceras para hosting estático.

**Qué corregí o rechacé:** pendiente de completar durante la validación en mi computadora.

**Verificación ejecutada aquí:** `node --check` para los archivos JavaScript del backend y `node --test tests/security-phase3.test.js` (5 pruebas pasaron). No se pudo completar `npm install` en este entorno por timeout; falta ejecutar pruebas de integración con las dependencias instaladas y comprobar el despliegue real.


## Fase 4 — Dependencias, logs y monitoreo

**Objetivo:** añadir logging estructurado redactado, eventos de auditoría, scripts npm de auditoría, Dependabot y un workflow automatizado de CI.

**Resultado:** logger JSON con lista de campos permitidos, middleware `requestLogger`, eventos para auth/autorización/productos/ventas/asistente, pruebas de no-registro de secretos, configuración de Dependabot y workflow GitHub Actions.

**Limitación real:** intenté generar el lockfile npm, pero el registro agotó el tiempo de espera de este entorno; no se pudo ejecutar una auditoría de vulnerabilidades válida.

**Qué corregí o rechacé:**

____________________________________________________


## Panel de administración

**Prompt:** Añadir un panel exclusivo para `admin` con métricas, gestión de usuarios y roles, bloqueo seguro del último administrador y auditoría de acciones, respetando el CSRF y los esquemas de validación existentes.

**Qué devolvió la IA:** endpoints `/api/admin`, servicio transaccional de usuarios, tabla `admin_audit_events`, vista React `/admin`, formularios controlados y accesos rápidos.

**Qué corregí o rechacé:**

____________________________________________________________

## Registro — Preparación local de Google OAuth

**Prompt usado:** configurar el Client ID de Google OAuth para el login/registro de Raíz & Madera y preparar un proceso local para guardar el secreto sin incluirlo en Git ni en el ZIP.

**Qué devolvió la IA:** Client ID público preconfigurado en las plantillas de backend y producción, script PowerShell `scripts/configurar-google-local.ps1` para pedir el nuevo Client Secret de forma oculta, generar `SESSION_SECRET` si falta y ajustar `DATABASE_URL` desde `.env` raíz cuando corresponde; documentación de orígenes y callback exactos, migraciones y diagnóstico de errores comunes.

**Qué corregí o rechacé:**

____________________________________________________


## 7. Adaptación de persistencia e integración a MySQL + n8n

**Prompt utilizado:** cambiar el proyecto Raíz & Madera para usar MySQL y dejar documentada/conectada la integración del asistente n8n con el frontend a través de la API protegida.

**Qué devolvió la IA:** driver `mysql2/promise`, store de sesiones MySQL, esquemas MySQL 8.4, Compose local/producción, variables DB_*, copia cifrada MySQL, guía `docs/MYSQL_N8N_SETUP.md`, instrucciones de credenciales n8n y checklist de pruebas.

**Qué corregí o rechacé:**

