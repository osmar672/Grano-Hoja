# Fase 2 de seguridad — Raíz & Madera

- Los endpoints de catálogo, ventas, resumen y agente tienen middleware de sesión y rol aplicado en Express.
- Esquemas Zod estrictos validan nombres, descripción, categoría permitida, precio, stock, IDs, query params, pagos, cantidades y solicitud del asistente.
- `admin` puede eliminar productos; `encargado` administra catálogo sin borrar; `caja` registra ventas y consulta catálogo/resumen/alertas.
- El asistente de reposición requiere `admin` o `encargado` y se invoca a través de un proxy de backend.
- n8n accede a los reportes read-only mediante un token distinto del token de entrada al webhook.
- Las consultas SQL están parametrizadas y el `ORDER BY` usa lista blanca.

Las medidas de cabeceras/CSP/HSTS/HTTPS y el diseño final de CSRF quedan para la fase de seguridad correspondiente. Ejecuta `npm test` localmente y verifica la API con Postman antes de dar la fase por aceptada.
