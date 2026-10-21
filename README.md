# Raíz & Madera

Sistema de gestión para una tienda de **plantas, muebles y decoración**. Incluye catálogo, inventario por unidades, ventas, cierre de caja y un asistente de reposición con n8n. La identidad visual conserva la temática de bosque verde oscuro, crema y motivos botánicos, con animaciones CSS sutiles.

> **Nota sobre el alcance académico:** este proyecto reemplaza el caso original de cafetería por una tienda de decoración, tal como se solicitó durante el rediseño. Si la evaluación exige mantener literalmente el Caso 1 de la rúbrica del Laboratorio #2, confirma con el docente que acepta este cambio de dominio. Se mantienen las características técnicas de CRUD, sesión, roles, transacciones, reportes, frontend y agente.

## Funciones

- Inicio de sesión mediante sesión almacenada en PostgreSQL; contraseñas con bcrypt y límite de intentos.
- Roles `admin`, `encargado` y `caja`, autorizados en el backend.
- Catálogo de plantas, muebles y decoración con búsqueda, filtros y ordenamiento.
- CRUD de productos, incluyendo precio, descripción, categoría, existencias, mínimo de reposición y estado activo.
- Ventas con precio histórico por línea, impuesto de demostración del 13 %, método de pago y estado.
- Confirmación de venta en transacción: bloquea los productos por ID, valida existencias y descuenta stock sin permitir cantidades negativas.
- Anulación de venta confirmada durante los primeros 15 minutos desde la confirmación; el stock se devuelve dentro de la transacción. Las pendientes se pueden anular sin ajustar stock.
- Panel con total diario por método de pago, cinco artículos más vendidos y alertas de bajo stock.
- Reportes de productos por debajo del mínimo y ventas de los últimos siete días; el agente redacta sugerencias, pero no modifica existencias.
- Diseño adaptable y animaciones que respetan `prefers-reduced-motion`.

## Estructura

```text
Raiz-y-Madera/
├── schema.sql
├── compose.yaml
├── backend/
│   ├── src/routes/          # Endpoints REST
│   ├── src/controllers/     # Entrada/salida HTTP
│   ├── src/services/        # SQL y reglas de negocio
│   ├── src/middleware/      # Sesión, roles, validación y errores
│   ├── src/validation/      # Esquemas Zod
│   └── scripts/seed-users.js
├── frontend/
│   └── src/                 # React, páginas, componentes, hooks y servicios
├── n8n/workflow_raiz_madera.json
├── tests/Raiz-y-Madera.postman_collection.json
├── SECURITY.md
└── BITACORA_IA.md
```

## Requisitos

- Node.js 20+ y npm.
- Docker Desktop con Docker Compose, o PostgreSQL 14+ instalado.
- Para el agente, una instancia n8n y una credencial para el modelo de chat que elijas.

## 1. Preparar PostgreSQL (Windows / Docker Desktop)

Desde la raíz del proyecto, abre PowerShell:

```powershell
Copy-Item .env.example .env
notepad .env
```

Define `POSTGRES_PASSWORD` con una contraseña propia. Luego crea la base:

```powershell
docker compose up -d db
```

PostgreSQL ejecuta `schema.sql` automáticamente al inicializar un volumen nuevo. Si vienes de la versión Grano & Hoja y tienes el volumen antiguo, los inicializadores no se ejecutan otra vez. Para una base de demostración desechable puedes reiniciar desde cero:

```powershell
docker compose down -v
docker compose up -d db
```

**Advertencia:** `docker compose down -v` elimina los datos de la base anterior. No lo ejecutes si necesitas conservarlos. También puedes crear una base nueva `raiz_madera` y cargar `schema.sql` en pgAdmin o con `psql`.

Comprobaciones SQL:

```sql
SELECT COUNT(*) FROM productos;
SELECT categoria, COUNT(*) FROM productos GROUP BY categoria;
SELECT nombre, stock, stock_minimo FROM productos WHERE stock < stock_minimo;
SELECT estado, COUNT(*) FROM pedidos GROUP BY estado;
```

## 2. Configurar y ejecutar el backend

Copia las variables de ejemplo y edita el archivo local:

```powershell
Copy-Item backend/.env.example backend/.env
notepad backend/.env
```

En `backend/.env`, conserva las variables e introduce la misma contraseña PostgreSQL que configuraste en la raíz, en `DATABASE_URL`. Genera un secreto para la sesión:

```powershell
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

Pega ese valor en `SESSION_SECRET`. Define tres contraseñas distintas en `SEED_ADMIN_PASSWORD`, `SEED_MANAGER_PASSWORD` y `SEED_CASHIER_PASSWORD`. Cada una debe tener al menos 12 caracteres, incluir mayúscula, minúscula y número y no superar 72 bytes. No las pongas en Git ni en capturas.

Luego ejecuta:

```powershell
cd backend
npm install
npm run users:seed
npm run check
npm test
npm run dev
```

La API queda en `http://localhost:3001`. Prueba `http://localhost:3001/api/health`; debe devolver `200` y `{"ok":true,"message":"API Raíz & Madera activa"}`. Los endpoints comerciales devuelven `401` si no hay sesión activa.

### Registro y acceso con Google

La pantalla `/login` ofrece **Continuar con Google** y **Crear usuario con Google**. La integración usa el flujo OAuth 2.0 Authorization Code del servidor con la biblioteca oficial `google-auth-library`, `state`, `nonce`, PKCE S256 y verificación del ID token. Solo se solicitan los scopes OpenID `openid`, `email` y `profile`; la aplicación no lee el buzón ni pide la contraseña de Google. Google exige que el URI de redirección coincida exactamente con el configurado en Cloud Console.

1. En [Google Cloud Console](https://console.cloud.google.com/apis/credentials), crea o selecciona un proyecto y configura la pantalla de consentimiento OAuth.
2. Crea credenciales de **OAuth client ID** de tipo **Web application**.
3. Añade este URI en **Authorized redirect URIs**: `http://localhost:3001/api/auth/google/callback`. Para producción, usa el callback HTTPS exacto de tu dominio.
4. Copia `backend/.env.example` a `backend/.env` y define `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI` y `FRONTEND_URL`. Nunca pongas el secreto en una variable `VITE_`.
5. Ejecuta la migración `backend/migrations/002_google_oauth.sql` en la base de datos existente, reinicia el backend y prueba primero con un usuario de test de la pantalla de consentimiento.

Para una base nueva, `schema.sql` ya incluye los campos; la migración 002 crea además el índice único del identificador de Google. En PowerShell, desde la raíz del proyecto, puedes aplicar la migración así (ajusta el usuario/base si los personalizaste):

```powershell
Get-Content backend/migrations/002_google_oauth.sql | docker compose exec -T db psql -U postgres -d raiz_madera
```

El registro de Google crea una cuenta con rol inicial `caja` y nunca permite elegir `admin` ni `encargado`. Si el correo ya existe como cuenta local, no se enlaza de forma automática; así se evita elevar privilegios por coincidencia de correo. Esa cuenta sigue entrando con su método habitual. La sesión se regenera después del callback. La cookie utiliza `SameSite=Lax` porque el callback OAuth llega como navegación GET desde Google; conserva `HttpOnly` y `Secure` en producción.

### Usuarios iniciales

Los correos de muestra se configuran en `backend/.env`:

- `admin@raizymadera.local` — administración y todas las operaciones.
- `encargado@raizymadera.local` — catálogo, operaciones y asistente de reposición; no elimina productos.
- `caja@raizymadera.local` — consulta catálogo, registra ventas y consulta cierre/alertas; no modifica catálogo ni usa el asistente.

Las contraseñas no se distribuyen en el ZIP. Tú las defines en `.env` y el script guarda hashes bcrypt.

## 3. Ejecutar el frontend

Abre otra terminal desde la raíz:

```powershell
Copy-Item frontend/.env.example frontend/.env
cd frontend
npm install
npm run dev
```

Abre la URL que muestre Vite (normalmente `http://localhost:5173`). No abras `index.html` con doble clic. El frontend usa `VITE_API_URL=http://localhost:3001/api` y mantiene la cookie de sesión mediante `credentials: 'include'`.

## 4. Flujo de venta e inventario

1. La persona selecciona productos y cantidades en `/pedidos/nuevo`.
2. La API crea una venta pendiente y guarda el precio unitario de cada línea.
3. La pantalla solicita la confirmación. El backend vuelve a leer y bloquear los productos dentro de una transacción.
4. Si el stock agregado para cualquiera de los productos no alcanza, responde `409`, hace `ROLLBACK` y no descuenta parcialmente.
5. Si alcanza, descuenta stock y pone la venta en `confirmado`.
6. Durante 15 minutos desde `fecha_confirmacion`, se puede anular. En ese caso, se devuelve stock y el pedido pasa a `anulado`. Fuera del plazo la API devuelve `409`.
7. Las ventas anuladas no cuentan en el cierre de caja.

El impuesto del 13 % se conserva como regla del ejercicio. Si la tienda operara realmente, verifica el tratamiento fiscal que corresponda antes de usar el sistema con datos de producción.

## 5. API disponible

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/api/health` | Salud del servidor |
| POST | `/api/auth/login` | Inicio de sesión con rate limit |
| GET | `/api/auth/google/start?intent=login` | Inicio con cuenta Google ya vinculada |
| GET | `/api/auth/google/start?intent=register` | Crear usuario nuevo verificando Google (rol inicial caja) |
| GET | `/api/auth/google/callback` | Callback OAuth validado por el servidor |
| GET | `/api/auth/me` | Usuario de la sesión actual |
| POST | `/api/auth/logout` | Destruir sesión |
| GET | `/api/productos` | Catálogo con `q`, `categoria`, `orden`, `direccion`, `activo`, `bajo_stock` |
| POST | `/api/productos` | Crear producto (`admin`, `encargado`) |
| GET | `/api/productos/:id` | Detalle y ventas recientes agregadas |
| PUT / PATCH | `/api/productos/:id` | Editar producto (`admin`, `encargado`) |
| DELETE | `/api/productos/:id` | Eliminar producto (`admin`); no permite borrar un producto con ventas históricas |
| GET | `/api/pedidos` | Historial con `estado` y `metodo_pago` opcionales |
| POST | `/api/pedidos` | Crear venta pendiente con items |
| GET | `/api/pedidos/:id` | Detalle de venta e items |
| POST | `/api/pedidos/:id/confirmar` | Confirmar y descontar inventario en transacción |
| POST | `/api/pedidos/:id/anular` | Anular dentro de las reglas del negocio |
| GET | `/api/resumen?fecha=YYYY-MM-DD` | Cierre de caja del día en `America/Costa_Rica` |
| GET | `/api/reportes/productos-bajo-stock` | Alerta de productos bajo mínimo (sesión autorizada o token de servicio) |
| GET | `/api/reportes/ventas-semana` | Unidades vendidas, stock actual y cantidad sugerida (admin/encargado o token de servicio) |
| POST | `/api/agente/sugerencia-compra` | Proxy autenticado al asistente privado de n8n (admin/encargado) |

Errores en HTTP se devuelven como `{ "error": "mensaje" }`. Los códigos relevantes son `400` para datos inválidos, `401` para falta de sesión, `403` para rol sin permisos, `404` para ID inexistente y `409` para conflictos como stock insuficiente, duplicados o anulación vencida.

## 6. Configurar n8n

Importa `n8n/workflow_raiz_madera.json`. En el nodo **OpenAI Chat Model**, selecciona una credencial de modelo de chat. El JSON no contiene credenciales.

En `backend/.env` configura:

- `N8N_WEBHOOK_URL`: URL real del webhook activado.
- `N8N_WEBHOOK_AUTH_TOKEN`: secreto largo que también se configura como credencial **Header Auth** del nodo Webhook usando el header `x-rm-webhook-token`.
- `N8N_API_SERVICE_TOKEN`: otro secreto diferente, para los HTTP Request Tools de n8n hacia la API usando el header `x-service-token`.

React **no** llama al webhook directamente; utiliza `POST /api/agente/sugerencia-compra`. Los secretos de servicio permanecen en backend/n8n, nunca en variables `VITE_`. Ajusta las URLs de las herramientas si n8n se ejecuta fuera del Docker Desktop del host:

- n8n en Docker y API en el host: normalmente `http://host.docker.internal:3001/api`.
- n8n en el mismo host sin Docker: `http://localhost:3001/api`.
- n8n Cloud: la API debe ser accesible por una URL HTTPS desde la nube; `localhost` no funciona allí.

El agente lee productos de bajo stock y reporte semanal y responde `{ ok, data, error }`. Solo redacta recomendaciones; no actualiza stock ni crea órdenes.

## 7. Pruebas manuales / Postman

Importa `tests/Raiz-y-Madera.postman_collection.json` en Postman. Define `adminPassword` y `cashierPassword` como variables de colección solo en tu entorno local y ejecuta la colección de arriba abajo: primero comprueba que caja no puede administrar el catálogo, luego inicia sesión como admin y corre el CRUD y las ventas. Postman mantiene la cookie de sesión.

La colección incluye health, login, sesión, catálogo, reportes, CRUD de producto temporal, crear/confirmar/anular una venta y logout. Comprueba también manualmente que:

- Sin cookie `GET /api/productos` devuelve `401`.
- El rol `caja` recibe `403` al intentar `POST /api/productos`.
- Crear o confirmar una venta con más unidades de las disponibles responde `409` y deja el stock sin cambios.
- Una anulación fuera de los 15 minutos devuelve `409`.
- Un texto HTML en `nombre` o `descripcion` es rechazado con `400`.

## 8. Seguridad, datos personales y despliegue

Consulta `SECURITY.md` para medidas, pendientes y configuración. Las medidas actuales incluyen sesión server-side en PostgreSQL, cookie HttpOnly/SameSite, hash bcrypt, bloqueo temporal de login, rate limiting, autorización por rol, esquemas Zod estrictos, SQL parametrizado y secretos en `.env`.

La configuración de HTTPS/HSTS/CSP/CSRF para producción, copias de seguridad cifradas y una ejecución completa de OWASP ZAP siguen requiriendo despliegue/pruebas externas. No lo publiques como sistema de producción hasta completar los pendientes, probar restauración de backups, revisar `npm audit` en tu entorno y configurar HTTPS en el proxy/hosting. Para datos personales, minimiza los datos recogidos y revisa los avisos de privacidad y consentimiento de acuerdo con la Ley 8968 de Costa Rica antes de operar con clientes reales.

## 9. Git

```bash
git init
git add .
git commit -m "feat: transformar el sistema en Raíz & Madera"
```

Si ya existe un remoto, usa `git remote -v` para verificarlo y después `git push`. No agregues `.env`, tokens, contraseñas ni credenciales exportadas.
