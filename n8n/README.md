# Agente de compras — n8n

Esta carpeta está reservada para el workflow exportado como `workflow.json` durante la fase del agente. Ese archivo todavía no se ha creado porque seguimos en la Fase 1 de planificación.

## Requisitos de la rúbrica

- Webhook HTTP POST que recibe la solicitud del frontend.
- AI Agent con un modelo de chat configurado en n8n.
- Herramientas HTTP para consultar el endpoint de insumos bajo mínimo y el reporte de ventas de los últimos siete días.
- Prompt de sistema que devuelva sugerencias justificadas por stock, mínimo y consumo semanal.
- Respond to Webhook con contrato `{ "ok": true, "data": ..., "error": null }` en éxito y `{ "ok": false, "data": null, "error": "..." }` en fallo.
- Rama de error y política CORS coherente con el origen del frontend.
- Exportación JSON sin credenciales ni tokens.

La implementación se hará en la fase de agente. No incluyas credenciales en el JSON exportado ni en Git.
