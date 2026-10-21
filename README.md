# Grano & Hoja ☕

Sistema de punto de venta e inventario por insumos para una cafetería. Proyecto individual del Laboratorio #2: Node.js + Express + PostgreSQL, React + Vite y un agente de compras con n8n.

> **Estado de esta entrega:** incluye implementación inicial integrada de backend, frontend, esquema y datos de muestra, colección Postman, workflow n8n sin credenciales y documentación. El workflow requiere que selecciones una credencial de modelo de chat en tu instancia n8n. Antes de una entrega evaluada, sigue la lista de pruebas y confirma el funcionamiento en tu propio entorno.

## Contenido

- `schema.sql`: las cinco tablas del caso y datos de demostración.
- `backend/`: API REST por capas (rutas, controladores, servicios, Pool de PostgreSQL).
- `frontend/`: aplicación React con React Router y CSS propio.
- `n8n/workflow_grano_hoja.json`: workflow importable de agente de compras sin credenciales.
- `tests/Grano-Hoja.postman_collection.json`: requests iniciales para Postman.
- `BITACORA_IA.md`: registro de decisiones y prompts importantes.
- `docs/`: guía de arquitectura, pruebas y defensa individual.

## Requisitos

- Node.js 20 o superior y npm.
- PostgreSQL 14 o superior.
- Para el agente: una instancia de n8n y una credencial válida para el modelo de chat que configures.

## 1. Preparar PostgreSQL

**Opción A (Docker Desktop):** desde la raíz copia `.env.example` a `.env`, define tu contraseña local en `POSTGRES_PASSWORD` y ejecuta `docker compose up -d db`. Compose carga `schema.sql` automáticamente la primera vez que se crea el volumen. En `backend/.env`, configura `DATABASE_URL=postgresql://postgres:TU_PASSWORD@localhost:5432/grano_hoja`, reemplazando `TU_PASSWORD` por exactamente la misma contraseña que elegiste. El archivo `.env` está excluido de Git. Si necesitas reiniciar la base de demostración desde cero, `docker compose down -v` elimina también el volumen y todos sus datos; después ejecuta `docker compose up -d db` otra vez.

**Opción B (PostgreSQL instalado):** crea la base de datos y carga el esquema desde la raíz del repositorio:

```bash
createdb grano_hoja
psql -d grano_hoja -f schema.sql
```

Si `createdb` no está disponible, crea `grano_hoja` desde pgAdmin y ejecuta `schema.sql` en Query Tool. **Aviso:** el script comienza con `DROP TABLE IF EXISTS`; está diseñado para reiniciar los datos de demostración y elimina las tablas del caso existentes en esa base.

Comprueba los datos:

```sql
SELECT COUNT(*) FROM productos;
SELECT COUNT(*) FROM insumos;
SELECT estado, COUNT(*) FROM pedidos GROUP BY estado;
SELECT * FROM insumos WHERE stock < stock_minimo;
```

### Atajo para Windows PowerShell

Si tienes Docker Desktop, desde la raíz abre una terminal PowerShell y ejecuta:

```powershell
Copy-Item .env.example .env
notepad .env
# cambia POSTGRES_PASSWORD por una contraseña local
docker compose up -d db
Copy-Item backend/.env.example backend/.env
notepad backend/.env
```

En `backend/.env`, coloca la misma contraseña que escribiste en `.env` de la raíz, por ejemplo `DATABASE_URL=postgresql://postgres:TU_PASSWORD@localhost:5432/grano_hoja`. Después abre una terminal para el backend y otra para el frontend, tal como indican los siguientes pasos.

## 2. Iniciar la API

```bash
cd backend
npm install
```

Copia `.env.example` como `.env` y ajusta `DATABASE_URL` a tu PostgreSQL. Ejemplo local:

```env
PORT=3001
DATABASE_URL=postgresql://postgres:TU_PASSWORD@localhost:5432/grano_hoja
CORS_ORIGIN=http://localhost:5173
TZ=America/Costa_Rica
```

Inicia el modo de desarrollo:

```bash
npm run dev
```

Comprueba la API:

```bash
curl http://localhost:3001/api/health
curl http://localhost:3001/api/productos
curl http://localhost:3001/api/resumen
```

Respuesta de salud esperada: `200` y `{"ok":true,"message":"API Grano & Hoja activa"}`.

## 3. Iniciar React

En otra terminal:

```bash
cd frontend
npm install
```

Copia `frontend/.env.example` a `frontend/.env`:

```env
VITE_API_URL=http://localhost:3001/api
VITE_N8N_WEBHOOK_URL=http://localhost:5678/webhook/grano-hoja/asistente-compras
```

Inicia Vite:

```bash
npm run dev
```

Abre la URL que muestra Vite, normalmente `http://localhost:5173`. No abras `index.html` con doble clic: React necesita el servidor de Vite.

## 4. Configurar n8n

Importa `n8n/workflow_grano_hoja.json` en n8n. Abre **OpenAI Chat Model** y selecciona/crea tu credencial de modelo. El JSON no contiene credenciales. Activa el workflow y copia la **Production URL** del nodo Webhook a `VITE_N8N_WEBHOOK_URL`.

El workflow exportado trae `http://host.docker.internal:3001/api` en los dos HTTP Request Tool, útil cuando n8n corre en Docker Desktop y la API corre en el host. Si n8n corre directamente en el mismo equipo, cambia ambas URLs a `http://localhost:3001/api`. En n8n Cloud debe ser una URL HTTPS pública que pueda alcanzar la API; `localhost` de tu PC no es accesible desde la nube.

El nodo Webhook permite el origen `http://localhost:5173` mediante CORS. Para despliegue, cambia el origen por el dominio real del frontend.

## Diagrama entidad-relación

```mermaid
erDiagram
  PRODUCTOS ||--o{ RECETAS : tiene
  INSUMOS ||--o{ RECETAS : utiliza
  PEDIDOS ||--|{ PEDIDO_ITEMS : contiene
  PRODUCTOS ||--o{ PEDIDO_ITEMS : vendido_en
  PRODUCTOS {
    int id PK
    string nombre
    numeric precio
    string categoria
    boolean activo
  }
  INSUMOS {
    int id PK
    string nombre
    string unidad
    numeric stock
    numeric stock_minimo
  }
  RECETAS {
    int id PK
    int producto_id FK
    int insumo_id FK
    numeric cantidad
  }
  PEDIDOS {
    int id PK
    timestamptz fecha
    timestamptz fecha_confirmacion
    string metodo_pago
    numeric subtotal
    numeric impuesto
    numeric total
    string estado
  }
  PEDIDO_ITEMS {
    int id PK
    int pedido_id FK
    int producto_id FK
    int cantidad
    numeric precio_unitario
  }
```

## Rutas principales

| Método | Ruta | Descripción |
|---|---|---|
| GET/POST | `/api/insumos` | Listar/crear insumos |
| GET/PUT/PATCH/DELETE | `/api/insumos/:id` | Detalle/editar/eliminar insumo |
| GET | `/api/insumos/bajo-minimo` | Insumos con stock menor al mínimo |
| GET/POST | `/api/productos` | Listar/crear productos y recetas |
| GET/PUT/PATCH/DELETE | `/api/productos/:id` | Detalle/editar/eliminar producto |
| GET/POST | `/api/pedidos` | Historial/crear pedido pendiente |
| GET | `/api/pedidos/:id` | Pedido y líneas históricas |
| POST | `/api/pedidos/:id/confirmar` | Valida inventario y descuenta dentro de transacción |
| POST | `/api/pedidos/:id/anular` | Anula y, cuando corresponde, devuelve insumos |
| GET | `/api/resumen?fecha=YYYY-MM-DD` | Cierre de caja por día local |
| GET | `/api/reportes/ventas-semana` | Ventas y consumo estimado últimos 7 días |
| GET | `/api/health` | Comprobación de salud |

Los errores se responden como `{ "error": "mensaje" }`. Los conflictos de stock, transición de estado o referencias se responden con `409`.

## Reglas relevantes

- El pedido se crea en estado `pendiente`; confirmar valida recetas de **todas** las líneas agrupadas por insumo y bloquea inventario con `SELECT ... FOR UPDATE`.
- El servidor calcula subtotal y 13% de impuesto, redondeado a 2 decimales; cada item guarda el precio histórico.
- Solo se anula una venta confirmada durante los primeros 15 minutos desde `fecha_confirmacion`. Anular un pedido pendiente no toca stock.
- No se borran pedidos. Insumos referenciados por recetas y productos incluidos en pedidos históricos no se pueden borrar.
- Para que una anulación no devuelva cantidades equivocadas, la API impide cambiar la receta de un producto durante la ventana activa de anulación.
- Hora de negocio: `America/Costa_Rica`; el resumen agrupa por la fecha local de confirmación.

## Pruebas

Importa `tests/Grano-Hoja.postman_collection.json` en Postman, configura `baseUrl` como `http://localhost:3001`, y ejecuta primero los GET. Para una prueba manual crítica, crea un pedido con una cantidad de frappés superior a sus porciones disponibles e intenta confirmar: se espera `409` con un mensaje de insumos insuficientes.

Consulta `docs/PRUEBAS_Y_DEFENSA.md` para casos de 400/404/409, concurrencia, guion de demo y preguntas de defensa. No declares una prueba como aprobada hasta ejecutarla localmente.

## Git

```bash
git init
git add .
git commit -m "feat: implementar Grano & Hoja con API y frontend"
```

Si ya creaste el repositorio remoto, añade el remoto y realiza `git push -u origin main`. Nunca subas `.env` ni credenciales.
