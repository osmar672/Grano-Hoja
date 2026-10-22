# Asistente de compras — Grano & Hoja

El workflow oficial que se importa en n8n es `workflow_grano_hoja.json`. El workflow de la etapa anterior se conserva en `../legacy/n8n/` y no forma parte del despliegue actual.

## Configuración de credenciales

1. Importa `workflow_grano_hoja.json` en tu instancia n8n.
2. En el nodo **Webhook compras**, crea/selecciona credencial **Header Auth** con nombre de cabecera `x-gh-webhook-token` y un valor secreto independiente de al menos 32 bytes. Configura el mismo valor en `N8N_WEBHOOK_AUTH_TOKEN` del backend.
3. En los tres nodos HTTP Request Tool, configura la credencial **Header Auth** para enviar `x-service-token` con el valor de `N8N_API_SERVICE_TOKEN`. Ese token permite solo los endpoints de lectura para el agente; no debe ser igual al token del webhook.
4. Configura la credencial del modelo de IA (no se incluye ninguna clave dentro del JSON exportado).
5. Activa el workflow y copia su URL **Production** a `N8N_WEBHOOK_URL` del backend. La ruta es `/webhook/grano-hoja/asistente-compras`.
6. Define `N8N_API_BASE_URL` en el backend con el origen público del servicio API, sin `/api` ni ruta final. En desarrollo local con Docker puede ser `http://host.docker.internal:3001`; en Vercel, el dominio público de la API.
7. Verifica que `GET /api/insumos/bajo-minimo`, `GET /api/reportes/ventas-semana` y `GET /api/reportes/consumo-insumos-semana` respondan con la sesión autorizada o el token de servicio, y prueba el proxy `POST /api/agente/sugerencia-compra`.

Las herramientas de lectura usan el `apiBaseUrl` validado por el backend y no contienen URLs locales fijas. El workflow no modifica inventario ni crea órdenes de compra: solo devuelve sugerencias. La ejecución real del workflow requiere verificar credenciales y conectividad en la instancia n8n; no queda probada por una validación estática del JSON.
