# Workflow de reposición — Raíz & Madera

El archivo `workflow_raiz_madera.json` debe importarse en tu propia instancia n8n. No contiene credenciales por seguridad.

Sigue la guía paso a paso [`../docs/MYSQL_N8N_SETUP.md`](../docs/MYSQL_N8N_SETUP.md) para iniciar MySQL 8.4 y n8n con Docker Desktop, arrancar Express/React, crear las dos credenciales Header Auth, seleccionar la credencial OpenAI Chat Model, activar el Webhook y probar la respuesta desde el frontend.

## Arquitectura

`React → POST /api/agente/sugerencia-compra → Express (sesión + rol) → Webhook n8n → HTTP Request Tools → GET /api/reportes/... → MySQL`.

No se conecta n8n directamente a MySQL: las herramientas acceden a reportes de solo lectura de Express con `N8N_API_SERVICE_TOKEN`. El webhook requiere un token diferente (`N8N_WEBHOOK_AUTH_TOKEN`). La respuesta de salida es `{ ok, data, error }`.

En Windows con Docker Desktop, los nodos de herramienta usan `http://host.docker.internal:3001/api/reportes/...`. En producción deben configurarse los endpoints HTTPS del dominio desplegado en ambos nodos y `N8N_WEBHOOK_URL` en `backend/.env`/secrets de despliegue.
