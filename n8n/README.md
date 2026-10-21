# Workflow de reposición — Raíz & Madera

Importa `workflow_raiz_madera.json` en n8n. El workflow usa Webhook autenticado, validación de entrada, AI Agent, herramientas HTTP de lectura y `Respond to Webhook` con contrato `{ ok, data, error }`. El agente recomienda reposición de plantas, muebles y decoración; no modifica inventario.

## Backend → Webhook n8n

1. Genera un secreto con `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`.
2. Guárdalo solo en `backend/.env` como `N8N_WEBHOOK_AUTH_TOKEN` y define `N8N_WEBHOOK_URL` con la Production URL del webhook activado.
3. En n8n crea una credencial **Header Auth** con header `x-rm-webhook-token` y el mismo secreto.
4. Selecciona la credencial en la autenticación del nodo Webhook. No exportes credenciales dentro del JSON ni copies el token al frontend.
5. La interfaz llama a `POST /api/agente/sugerencia-compra`; Express comprueba la sesión y rol `admin`/`encargado` antes de llamar a n8n.

## n8n → API (solo lectura)

1. Genera un segundo token distinto con el comando anterior.
2. Guárdalo en `backend/.env` como `N8N_API_SERVICE_TOKEN` y reinicia Express.
3. Crea una credencial **HTTP Header Auth** con header `x-service-token` y ese valor.
4. Selecciona esa credencial en los nodos **Productos bajo mínimo** y **Ventas últimos 7 días**.
5. Ajusta los URLs según red: Docker Desktop suele usar `http://host.docker.internal:3001/api`; n8n local puede usar `http://localhost:3001/api`. Para n8n Cloud configura una URL HTTPS pública.

El token de servicio solo da acceso a los endpoints GET de reportes definidos; no permite crear ni modificar productos, ventas o existencias. Mantén las credenciales fuera del export JSON.
