# Matriz de cumplimiento de la rúbrica — Laboratorio #2

Esta matriz transcribe los seis criterios de evaluación y sus ponderaciones de la rúbrica proporcionada (sección 6, página 10). Los estados reflejan honestamente el ZIP actual: la planificación está preparada; el código funcional debe construirse y probarse en las fases correspondientes.

## Criterios y evidencia exigida

| Criterio de la rúbrica | Peso | Evidencia que debe existir al entregar | Estado en esta versión |
|---|---:|---|---|
| Base de datos y API | 25 % | Modelo relacional; `schema.sql` ejecutable con datos de ejemplo; API por capas; CRUD completo de al menos dos recursos; GET de detalle relacionado; respuestas 200, 201, 400, 404 y 409 probadas. | **Pendiente de implementación**; diseño documentado. |
| Lógica de negocio | 25 % | Validaciones en el servidor; impuesto del 13 %; disponibilidad por recetas; consumo agregado de insumos; transacciones para confirmar/anular; plazo de 15 minutos; cierre de caja SQL. | **Pendiente de implementación y pruebas**; reglas diseñadas. |
| Front en React | 20 % | React Router con al menos cuatro vistas; services/api.js; custom hook; formularios controlados; errores visibles; búsqueda, filtro y orden; panel consumiendo `/api/resumen`; componentes reutilizables. | **Pendiente de implementación**; arquitectura documentada. |
| Agente de IA | 10 % | Workflow n8n funcional con Webhook, AI Agent, herramientas que consultan la API y Respond to Webhook; conexión desde React; contrato `{ ok, data, error }`. | **Pendiente de implementación**; comportamiento diseñado. |
| Uso de IA y bitácora | 10 % | `BITACORA_IA.md` con al menos cinco prompts relevantes realmente usados, qué devolvió la IA y qué se corrigió o rechazó; capacidad de explicar el código. | **Parcial**; existe el registro de planificación, faltan registros reales de las fases posteriores. |
| Entrega y defensa | 10 % | Checkpoint del Día 1 con API y esquema ejecutados; README completo; workflow JSON sin credenciales; demo CRUD, dos reglas del negocio (una falla con 409) y defensa individual. | **Pendiente**; no se puede aprobar con un ZIP que solo contiene planificación. |

## Lista de control antes de declarar la entrega completa

### Día 1 — Backend y base de datos

- [ ] `schema.sql` en la raíz se ejecuta sin errores y crea las cinco tablas del caso con claves, checks, índices y datos realistas.
- [ ] La API se conecta a PostgreSQL mediante `pg.Pool`; el puerto y `DATABASE_URL` salen de `.env`.
- [ ] CRUD completo de `insumos` y `productos`; los detalles incluyen datos relacionados.
- [ ] Las respuestas y errores usan HTTP 200, 201, 400, 404 y 409 según el contrato.
- [ ] Los SQL usan parámetros; `ORDER BY` se valida con lista blanca.
- [ ] Confirmar y anular usan transacciones y bloqueo de insumos con `SELECT ... FOR UPDATE` ordenado por ID.
- [ ] El pedido que necesita más insumos de los disponibles falla con 409, sin modificar inventario.
- [ ] El cierre de caja usa SQL y excluye pedidos anulados.
- [ ] Los dos endpoints de apoyo del agente devuelven bajo mínimo y ventas/consumo de la semana.
- [ ] Casos de prueba de cada endpoint guardados en colección Postman/Thunder Client o una tabla reproducible.
- [ ] Commit de checkpoint del Día 1 y README parcial.

### Día 2 — React y agente

- [ ] `frontend/` arranca con Vite y tiene al menos cuatro vistas y un 404.
- [ ] `services/api.js` centraliza las llamadas y preserva `status` y el mensaje real de la API.
- [ ] `useFetch` maneja carga, error, datos, refetch y cancelación/limpieza al desmontar.
- [ ] Formularios controlados para crear/editar; validación cliente; mensajes 400/409 visibles; botones de envío deshabilitados durante el envío.
- [ ] El listado de productos implementa búsqueda, filtro y orden con los query params documentados.
- [ ] El panel consume `/api/resumen`; todos los listados distinguen carga, error y vacío.
- [ ] `n8n/workflow.json` está exportado sin credenciales y tiene rama de error con contrato consistente.
- [ ] El agente de compras justifica cantidades con stock actual, stock mínimo y consumo semanal.
- [ ] React presenta estados de carga/error para el asistente y valida la respuesta `{ ok, data, error }`.
- [ ] `BITACORA_IA.md` incluye como mínimo cinco prompts realmente utilizados, las respuestas relevantes y las correcciones/rechazos reales.
- [ ] README final explica cómo ejecutar base de datos, API, front y n8n.
- [ ] Demo de cinco minutos preparada: CRUD, regla de negocio exitosa y un caso 409, agente y métricas.

## Contrato de los entregables

```text
Grano-Hoja/
├── schema.sql
├── backend/
├── frontend/
├── n8n/
│   └── workflow.json
├── tests/
├── docs/
├── README.md
└── BITACORA_IA.md
```

El diagrama refleja el destino del repositorio. Los archivos ejecutables se añadirán por fases; no se deben crear archivos vacíos o ficticios y declarar que la funcionalidad está lista.

## Comprobación final

La rúbrica indica que la entrega final debe incluir backend y frontend funcionales, workflow n8n exportado sin credenciales, README y bitácora con al menos cinco prompts, además de demo y defensa (página 10). Por tanto, esta planificación alineada es una base de trabajo y un primer commit documental, no la entrega final que obtiene los puntos de implementación.
