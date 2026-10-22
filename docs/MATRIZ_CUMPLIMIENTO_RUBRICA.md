# Matriz de criterios técnicos

| Área técnica | Evidencia en Grano & Hoja | Cómo comprobar |
|---|---|---|
| Base de datos relacional | `schema.sql`, claves foráneas y restricciones | Cargar el esquema en MySQL 8.4 y verificar constraints |
| CRUD y HTTP REST | `backend/src/routes` y `backend/src/controllers` | Colección Postman |
| Transacciones | `backend/src/services/pedidos.service.js` | Confirmación con y sin stock y prueba concurrente |
| Frontend React | `frontend/src/pages`, componentes, hooks y servicios | `npm run build` y demo en navegador |
| Agente de IA | `n8n/workflow_grano_hoja.json` y proxy Express | Importar workflow y validar JSON de respuesta |
| Seguridad | `SECURITY.md`, sesiones, roles, Zod y tokens por entorno | Probar 401/403/400, login rate-limit y `npm audit` |
| Documentación y bitácora | `README.md`, `BITACORA_IA.md`, `docs/` | Revisión de pasos y registro de resultados |

**Límite importante:** la rúbrica original entregada en este chat describe el Caso 1 de una cafetería con `insumos` y `recetas`. Esta versión fue transformada intencionalmente en una tienda de plantas, muebles y decoración, por lo que ya no coincide literalmente con ese dominio. Los criterios técnicos se mantienen, pero confirma con el docente que autoriza el cambio si necesitas una calificación conforme a la rúbrica original.
