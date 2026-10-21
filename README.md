# Grano & Hoja — Punto de venta e inventario por insumos

Proyecto individual del Laboratorio #2: React + Node.js + PostgreSQL + n8n.

## Estado real de esta versión

**Fase 1 — planificación alineada con la rúbrica.** Este ZIP contiene la planificación del modelo de datos, el contrato propuesto de la API, la arquitectura de React, la matriz de evaluación, el plan de pruebas y la bitácora inicial. Todavía no contiene una API ejecutable, `schema.sql` con datos, una aplicación React funcional ni el workflow exportado de n8n. No se afirma que esos requisitos estén implementados antes de completar sus fases.

Esta distinción es importante: la rúbrica evalúa la entrega final funcional, no solamente el plan. La matriz `docs/MATRIZ_CUMPLIMIENTO_RUBRICA.md` señala cómo se comprobará cada porcentaje antes de declarar el proyecto terminado.

## Caso de negocio

Grano & Hoja es una cafetería que vende productos preparados mediante recetas. Cada receta consume insumos. Al confirmar un pedido, la API valida el consumo agregado de todo el pedido y descuenta inventario dentro de una transacción. El sistema conserva precios históricos, calcula el impuesto del 13 %, permite anular según la regla de 15 minutos y ofrece cierre de caja diario. Un agente de n8n analizará el inventario bajo mínimo y las ventas de los últimos siete días para justificar sugerencias de compra.

## Arquitectura prevista

- **Base de datos:** PostgreSQL, cinco tablas de negocio y relaciones con restricciones.
- **Backend:** Node.js + Express, `pg`, `cors`, `dotenv` y `nodemon`; capas `routes`, `controllers`, `services` y conexión `src/db.js`.
- **SQL de creación y datos:** `schema.sql` en la raíz del repositorio, para que sea fácil localizarlo en el checkpoint que solicita la rúbrica.
- **Frontend:** React con Vite, `react-router-dom`, `fetch` nativo y CSS propio.
- **Agente:** workflow n8n exportado a `n8n/workflow.json`, sin credenciales, conectado al frontend mediante webhook.
- **Documentación:** este README, diagrama ER, endpoints, reglas de negocio, instrucciones de ejecución y `BITACORA_IA.md`.

## Decisiones resumidas

- CRUD completo para `insumos` y `productos`; los pedidos se crean, consultan, confirman y anulan, pero no se eliminan.
- El producto se crea o edita junto con su receta en una transacción.
- Valores monetarios `NUMERIC(12,2)` y stock/recetas `NUMERIC(12,3)`.
- Zona horaria de reportes: `America/Costa_Rica`; plazo de anulación de 15 minutos desde la confirmación registrada.
- El backend es la fuente de verdad para precios, impuesto, disponibilidad, descuento/devolución de insumos y transiciones de estado.
- Las consultas SQL se parametrizan; el ordenamiento dinámico se valida con lista blanca; las credenciales se guardan en `.env`.
- Los combos con descuento del 10 % no se implementan en esta entrega.

## Documentos del proyecto

- [Matriz de cumplimiento de la rúbrica](docs/MATRIZ_CUMPLIMIENTO_RUBRICA.md)
- [Plan de Fase 1: backend, modelo ER y contrato de API](docs/FASE_1_BACKEND.md)
- [Plan de Fase 1: frontend, vistas, rutas y componentes](docs/FASE_1_FRONTEND.md)
- [Bitácora de IA](BITACORA_IA.md)
- [Notas del backend](backend/README.md)
- [Notas del frontend](frontend/README.md)
- [Plan de workflow n8n](n8n/README.md)
- [Plan de pruebas](tests/README.md)

## Plan de trabajo y puertas de aceptación

1. **Fase 1 — planificación:** revisar el diseño y alinearlo con la rúbrica.
2. **Fase 2 — base de datos:** crear el `schema.sql` raíz, restricciones, índices y datos de ejemplo; ejecutarlo sin errores.
3. **Fases 3–5 — backend:** implementar CRUD, middleware de errores, cálculos, transacciones, reglas de disponibilidad, anulación, cierre de caja y reportes de apoyo.
4. **Fase 6 — pruebas del backend:** ejecutar pruebas felices y de errores `400`, `404` y `409`, incluyendo pedidos concurrentes; guardar colección o tabla reproducible.
5. **Fase 7 — checkpoint:** README técnico y verificación del backend antes de iniciar el frontend.
6. **Día 2 — frontend:** React Router, estados de carga/error/vacío, hook `useFetch`, formularios, filtros, búsqueda, orden, panel y errores API visibles.
7. **Día 2 — agente:** workflow n8n con Webhook, AI Agent, herramientas HTTP hacia la API y Respond to Webhook; contrato `{ ok, data, error }`.
8. **Entrega final:** README de ejecución, workflow JSON sin credenciales, al menos cinco prompts reales documentados, demo y defensa.

No se debe pasar al frontend hasta que la API esté ejecutada y probada, tal como recomienda la rúbrica.

## Requisitos de herramientas

- Node.js y npm.
- PostgreSQL y `psql` (o adaptar explícitamente si se decide usar SQLite).
- Thunder Client o Postman para verificar HTTP.
- React/Vite para el frontend.
- n8n y un modelo de chat configurado para el nodo AI Agent.

## Git: primer commit documental

Después de extraer el ZIP, abre una terminal dentro de `Grano-Hoja`:

```bash
git init
git add .
git commit -m "docs: alinear planificación con rúbrica del laboratorio"
git branch -M main
git remote add origin URL_DE_TU_REPOSITORIO
git push -u origin main
```

Reemplaza `URL_DE_TU_REPOSITORIO` por la URL real de GitHub. Si `origin` ya existe, revisa `git remote -v` antes de añadirlo otra vez.

Este primer commit sirve para empezar el control de versiones; **no debe confundirse con la entrega final evaluable**. Cada fase posterior debe aportar implementación y pruebas.
