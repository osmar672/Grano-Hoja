# BITÁCORA DE USO DE IA — Grano & Hoja

> Registro inicial de prompts utilizados para construir y revisar la solución. Antes de la defensa, agrega los resultados de tus pruebas reales y explica qué entiendes de cada bloque. El campo **Qué corregí o rechacé** debe reflejar tus decisiones, no copiarse sin revisar.

## Prompt 1 — Modelo de datos
**Prompt usado:** Diseña un esquema PostgreSQL para una cafetería con insumos, productos, recetas, pedidos y pedido_items, relaciones, restricciones CHECK/NOT NULL y datos de ejemplo realistas. No implementes combos.

**Qué devolvió la IA:** `schema.sql` con cinco tablas, claves foráneas, índices, diez insumos, ocho productos, recetas y quince pedidos distribuidos en siete días.

**Qué corregí o rechacé:** _Completar después de revisar schema.sql y cargarlo en PostgreSQL._

## Prompt 2 — API segura por capas
**Prompt usado:** Implementa una API Node.js/Express por rutas, controladores y servicios con PostgreSQL, consultas parametrizadas, validación, códigos 200/201/400/404/409, y errores `{ error }`.

**Qué devolvió la IA:** backend con Pool, AppError, middleware central y CRUD para insumos/productos.

**Qué corregí o rechacé:** _Completar tras ejecutar y probar endpoints._

## Prompt 3 — Inventario y transacciones
**Prompt usado:** Implementa confirmación y anulación de pedidos con BEGIN/COMMIT/ROLLBACK, SELECT FOR UPDATE ordenado por id, agregación de necesidades compartidas, 13% de impuesto y ventana de anulación de 15 minutos.

**Qué devolvió la IA:** servicios transaccionales de pedido y consulta SQL para resumen diario y reporte semanal.

**Qué corregí o rechacé:** _Completar después de comprobar stock antes/después y los casos 409._

## Prompt 4 — Frontend React
**Prompt usado:** Crea un frontend React/Vite con React Router, capa services/api.js, hook useFetch, formularios controlados, estados loading/error/empty, CRUD, filtros, búsqueda, orden y tarjetas de métricas. Usa CSS propio sin librerías UI.

**Qué devolvió la IA:** vistas Panel, Productos, Detalle, Insumos, Pedidos, Nuevo pedido y Asistente, con componentes reutilizables y variables CSS de café/verde/crema.

**Qué corregí o rechacé:** _Completar después de ejecutar Vite y probar flujo por flujo._

## Prompt 5 — Agente n8n
**Prompt usado:** Genera un workflow n8n importable con Webhook POST, validación de entrada, AI Agent, modelo de chat, HTTP Request Tools para bajo mínimo y ventas semanales, Respond to Webhook y contrato `{ ok, data, error }`. No incluyas credenciales.

**Qué devolvió la IA:** `n8n/workflow_grano_hoja.json` sin tokens ni IDs de credenciales; debe seleccionarse la credencial de modelo al importar y configurarse la URL de la API según el entorno.

**Qué corregí o rechacé:** _Completar luego de importar, configurar, activar y probar con curl._

## Prompt 6 — Alineación con rúbrica y pruebas
**Prompt usado:** Revisa el proyecto frente a la rúbrica del Laboratorio #2 e incluye una colección de pruebas, documentación de ejecución, riesgos, guion de demo y preguntas de defensa.

**Qué devolvió la IA:** README de raíz, colección Postman, guía de pruebas y defensa, y checklist relacionado con las ponderaciones de evaluación.

**Qué corregí o rechacé:** _Completar después de usar la colección y contrastar cada criterio con evidencia real._
