# Configuración de MySQL y n8n — Grano & Hoja

## 1. MySQL local

1. Copia `.env.example` a `.env` y `backend/.env.example` a `backend/.env` si aún no existen.
2. Ejecuta el asistente de PowerShell, que genera tokens/secretos locales y sincroniza las variables MySQL sin mostrar los secretos:

   ```powershell
   powershell -ExecutionPolicy Bypass -File .\scripts\configurar-integracion-local.ps1
   ```

3. Inicia MySQL y n8n:

   ```powershell
   docker compose up -d db n8n
   docker compose ps
   ```

   En el primer arranque del volumen local se ejecuta `schema.sql`, que contiene datos demo y `DROP TABLE`; nunca lo uses para inicializar una base con datos que deban conservarse. Los nombres históricos de volúmenes Docker se mantienen deliberadamente para no desconectar instalaciones existentes.

4. Ejecuta la API desde `backend/` con `npm run dev` y la interfaz desde `frontend/` con `npm run dev`. Para la API local, n8n utiliza `N8N_API_BASE_URL=http://host.docker.internal:3001` si corre en Docker en Windows. En Linux, comprueba que `host.docker.internal` esté definido/resuelto en tu Docker Compose; si no, usa el host/gateway accesible desde el contenedor.

## 2. Importar el workflow oficial

1. Abre `http://localhost:5678`, termina el onboarding y entra en **Workflows**.
2. Importa `n8n/workflow_grano_hoja.json`. El workflow de la etapa anterior está en `legacy/n8n/` y no es el que debe activarse.
3. Crea en n8n una credencial de tipo **Header Auth** para el nodo Webhook:
   - Nombre sugerido: `Grano & Hoja Webhook Token`.
   - Header: `x-gh-webhook-token`.
   - Valor: el mismo secreto que `N8N_WEBHOOK_AUTH_TOKEN` en `backend/.env`.
4. Crea otra credencial **Header Auth** para los nodos HTTP Request Tool:
   - Nombre sugerido: `Grano & Hoja API Service Token`.
   - Header: `x-service-token`.
   - Valor: el mismo secreto que `N8N_API_SERVICE_TOKEN` en `backend/.env`.
5. Asigna la credencial de Header Auth correcta al Webhook y a cada HTTP Request Tool. No incrustes tokens en el JSON exportado.
6. Configura una credencial válida para el nodo de modelo de chat. El JSON no exporta las credenciales de proveedor.
7. Activa el workflow y confirma el path `/webhook/grano-hoja/asistente-compras`. La URL final debe coincidir con `N8N_WEBHOOK_URL` del backend.

## 3. Cómo interactúan frontend, backend y n8n

- React llama `POST /api/agente/sugerencia-compra` con `{ "solicitud": "..." }`.
- Express exige una sesión y permisos apropiados, y reenvía la solicitud a `N8N_WEBHOOK_URL` con `x-gh-webhook-token`. También pasa `N8N_API_BASE_URL` como origen validado de la API.
- n8n usa `x-service-token` para consultar endpoints de solo lectura:
  - `GET /api/insumos/bajo-minimo`.
  - `GET /api/reportes/ventas-semana`.
  - `GET /api/reportes/consumo-insumos-semana`.
- El workflow no conecta directamente a MySQL ni debe recibir secretos en el cuerpo de la solicitud. No le concedas permisos de administrador ni añadas herramientas que escriban inventario sin un contrato/rol de servicio explícito.

## 4. Producción / Vercel

Usa una instancia n8n accesible por HTTPS. Configura `N8N_WEBHOOK_URL` con la URL pública del webhook activo, `N8N_API_BASE_URL` con el origen HTTPS del backend (sin ruta, query ni fragmento) y los dos tokens distintos. Desde Vercel, las variables se administran en **Project → Settings → Environment Variables**; después de modificarlas, crea un nuevo deployment porque las variables no se aplican retroactivamente a despliegues anteriores.

Variables de backend para n8n: `N8N_WEBHOOK_URL`, `N8N_API_BASE_URL`, `N8N_WEBHOOK_AUTH_TOKEN` y `N8N_API_SERVICE_TOKEN`. Los tokens tienen que ser distintos, fuertes y almacenados como secretos. En producción, `N8N_API_BASE_URL` tiene que coincidir con `PUBLIC_HTTPS_ORIGIN`.

## 5. Solución de problemas

- **La API no inicia:** valida `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `SESSION_SECRET` y `PUBLIC_HTTPS_ORIGIN`. Los logs indican el nombre de la variable faltante/error, no su valor.
- **El asistente devuelve error:** comprueba la URL/path activo del webhook y que la credencial de webhook corresponda a `N8N_WEBHOOK_AUTH_TOKEN`.
- **n8n recibe respuesta 401/403 al consultar API:** confirma `N8N_API_BASE_URL`, header `x-service-token`, `N8N_API_SERVICE_TOKEN` y permisos de las rutas consultadas.
- **El workflow no responde:** comprueba que esté guardado y activo, que el nodo Webhook use la ruta esperada y que el nodo de modelo tenga credencial válida.
- **MySQL desde Docker no accesible:** revisa `docker compose logs db`, `docker compose ps` y que API y n8n usen el host/puerto apropiado para su red.

## Estado de verificación

El archivo JSON del workflow se parseó correctamente y el verificador estático comprueba rutas/nombres de sus nodos. No se ejecutó el workflow en una instancia n8n real desde esta auditoría; la credencial del modelo, la credencial Header Auth y la URL accesible deben verificarse en el entorno del usuario.
