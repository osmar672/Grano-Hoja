# Matriz de cumplimiento de la rúbrica

Los criterios y porcentajes se tomaron de la rúbrica de Laboratorio #2. La marca de esta matriz indica que existe un artefacto para cubrir el criterio; **no significa que los servicios se hayan ejecutado en el equipo del estudiante**. Ejecuta la lista de pruebas y marca el resultado tras probarlo localmente.

| Criterio | Peso | Evidencia en este repositorio | Verificación local pendiente |
|---|---:|---|---|
| Base de datos y API | 25 % | `schema.sql`, CRUD de insumos/productos, rutas y servicios Express | Cargar schema y recorrer Postman; confirmar 200/201/400/404/409 |
| Lógica de negocio | 25 % | Transacciones de pedido, bloqueo `FOR UPDATE`, impuesto 13 %, plazo de 15 min, resumen | Confirmar stock antes/después y probar conflictos/concurrencia |
| Front en React | 20 % | `frontend/`, Router, `useFetch`, formularios controlados, filtro/búsqueda/orden, métricas | `npm install`, `npm run build`, conectar contra la API |
| Agente de IA | 10 % | `n8n/workflow_grano_hoja.json`, tools de HTTP, contrato `{ ok, data, error }` | Seleccionar credencial del modelo, activar workflow y probar webhook |
| Uso de IA y bitácora | 10 % | `BITACORA_IA.md` con seis prompts y campos de revisión | Completar correcciones/rechazos con experiencias y pruebas reales |
| Entrega y defensa | 10 % | `README.md`, diagrama ER, colección Postman, guía de defensa | Hacer demo, guardar evidencia y poder explicar cada decisión |

## Antes de entregar

- [ ] Reemplazar todos los valores de ejemplo con los de tu equipo, sin subir `.env`.
- [ ] Ejecutar la aplicación y completar `docs/PRUEBAS_Y_DEFENSA.md`.
- [ ] Importar y probar el workflow de n8n; exportarlo otra vez desde tu instancia si el docente exige el JSON generado por tu versión de n8n.
- [ ] Completar el campo “Qué corregí o rechacé” en cada entrada de la bitácora.
- [ ] Hacer commit después de que las pruebas reales pasen.
