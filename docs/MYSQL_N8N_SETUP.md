# Configuración de MySQL y n8n (Raíz & Madera)

Esta guía conecta React → Express → n8n → endpoints de reportes de Express. **n8n no se conecta directamente a MySQL**: así los permisos y consultas quedan centralizados en la API.

## 1. Configurar la base MySQL en Windows

1. Instala Docker Desktop y arráncalo.
2. Desde la raíz del proyecto, ejecuta `powershell -ExecutionPolicy Bypass -File .\scripts\configurar-integracion-local.ps1`. El asistente crea `.env` y `backend/.env`, genera las claves de sesión/n8n, alinea la contraseña DB de la API con el usuario MySQL y pide de forma oculta las tres contraseñas de usuarios y el nuevo Google Client Secret.
3. El `MYSQL_APP_PASSWORD` generado usa letras, números y guion bajo con al menos 32 caracteres; el script lo copia como `DB_PASSWORD` en `backend/.env`.
4. No reutilices el Google Client Secret que compartiste anteriormente: revócalo en Google Cloud Console y pega uno nuevo cuando lo pida el asistente. El secreto queda exclusivamente en `backend/.env`.

Generador local de secretos:

```powershell
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

Ejecuta varias veces para generar valores distintos.

Arranca MySQL y n8n:

```powershell
docker compose up -d db n8n
docker compose ps
```

En el primer arranque de un volumen nuevo, MySQL ejecuta `schema.sql`, crea las tablas y carga productos y ventas de demostración. Puedes revisar las tablas así:

```powershell
docker compose exec db mysql -u raiz_app -p raiz_madera
```

Introduce la contraseña `MYSQL_APP_PASSWORD` cuando la solicite. La base solo se publica en `127.0.0.1:3306`.

> Si el volumen MySQL ya existía, los scripts de `/docker-entrypoint-initdb.d` no se repiten. No borres el volumen si contiene datos que debas conservar. Para migrar una base PostgreSQL antigua, prepara/exporta los datos en un proceso aparte; los esquemas MySQL de este ZIP no convierten automáticamente datos PostgreSQL.

## 2. Instalar y arrancar el backend

Desde `backend/`:

```powershell
npm install
npm run check
npm test
npm run users:seed
npm run dev
```

`npm run users:seed` crea las cuentas locales configuradas en `backend/.env`. Los secretos de usuario no son parte del ZIP. Comprueba la API abriendo `http://localhost:3001/api/health`; readiness de base de datos en `http://localhost:3001/api/ready`.

## 3. Arrancar el frontend

En otra terminal desde la raíz:

```powershell
cd frontend
npm install
npm run build
npm run dev
```

Abre `http://localhost:5173`. El frontend usa rutas relativas `/api`, con Vite proxy al backend. No uses `localhost` como URL de API si el navegador está en otra computadora.

## 4. Crear y activar el workflow de n8n

1. Abre `http://localhost:5678` y termina el onboarding de n8n.
2. Importa `n8n/workflow_raiz_madera.json` en el editor.
3. En **Credentials**, crea una credencial de tipo **Header Auth** para el nodo `Webhook compras`:
   - Name: `Raiz Madera Webhook Token`
   - Header Name: `x-rm-webhook-token`
   - Header Value: el valor exacto de `N8N_WEBHOOK_AUTH_TOKEN` en `backend/.env`.
4. Selecciona esa credencial en el nodo `Webhook compras`.
5. Crea otra credencial **Header Auth** para los nodos `Productos bajo mínimo` y `Ventas últimos 7 días`:
   - Name: `Raiz Madera API Service Token`
   - Header Name: `x-service-token`
   - Header Value: el valor exacto de `N8N_API_SERVICE_TOKEN` en `backend/.env`.
6. Asigna la segunda credencial a ambas herramientas HTTP Request Tool.
7. En el nodo `OpenAI Chat Model`, crea/elige una credencial del proveedor de modelo de chat que tengas. El JSON exportado no incluye tokens de proveedor.
8. Guarda y activa el workflow. La URL de producción del Webhook será normalmente `http://localhost:5678/webhook/raiz-madera/asistente-compras`; `backend/.env` ya propone esta URL. Para ejecución manual en editor usa la URL de prueba que muestra el propio nodo.

### Cómo funcionan los dos tokens

- `N8N_WEBHOOK_AUTH_TOKEN`: Express lo envía al Webhook, y n8n verifica el header `x-rm-webhook-token`.
- `N8N_API_SERVICE_TOKEN`: n8n lo envía a `GET /api/reportes/productos-bajo-stock` y `GET /api/reportes/ventas-semana`, que comprueban el header `x-service-token`.
- No uses el mismo token para ambas credenciales. No los escribas en React, workflow JSON, bitácora o Git.

### URL de las herramientas

El workflow no guarda una URL fija para los dos nodos HTTP Request Tool. Express envía `apiBaseUrl` al Webhook desde `N8N_API_BASE_URL`; el nodo `Validar entrada` valida que sea un origen HTTP/HTTPS sin credenciales, path, query o fragmento, y las herramientas construyen sus rutas desde ese origen.

En Windows con Docker Desktop configura `N8N_API_BASE_URL=http://host.docker.internal:3001` en `backend/.env`. Para Vercel configura `N8N_API_BASE_URL=https://TU_PROYECTO.vercel.app`. En producción usa n8n accesible por HTTPS y `N8N_WEBHOOK_URL=https://TU_N8N_DOMINIO/webhook/raiz-madera/asistente-compras` en el backend. No expongas el editor n8n sin autenticación y protección de red.

## 5. Probar integración

1. Inicia sesión en React como `admin` o `encargado`.
2. Abre el apartado del asistente de reposición.
3. Pulsa generar sugerencia.
4. En n8n abre **Executions** y comprueba que se ejecutan las dos herramientas y el AI Agent.
5. La respuesta esperada desde Express tiene estructura `{ "ok": true, "data": { "resumen": "...", "sugerencias": [...] }, "error": null }`.
6. Comprueba con perfil `caja` que el endpoint `/api/agente/sugerencia-compra` responde `403`, aunque se intente llamar manualmente.

Diagnóstico rápido:
- API no se inicia: compara las variables `DB_*` con las variables MySQL de `.env` raíz.
- `ECONNREFUSED` en report tools: revisa que Express escuche en puerto 3001 y que `host.docker.internal` funcione desde Docker Desktop.
- Webhook 401/403: comprueba header name/value de credenciales.
- Respuesta 502 desde API: mira la ejecución del workflow y configura la credencial de modelo.
- `503` desde el agente: revisa `N8N_WEBHOOK_URL` y token en `backend/.env`.
