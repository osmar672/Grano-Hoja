# Estado de validación técnica

Fecha de preparación: 21 de octubre de 2026.

## Comprobaciones realizadas durante la generación

- `node --check` para los archivos JavaScript del backend: sin errores de sintaxis.
- Parseo de los archivos `.js` y `.jsx` del frontend con el transpiler de TypeScript: 25 archivos, 0 diagnósticos.
- Resolución de importaciones relativas del frontend: 68 importaciones comprobadas, sin archivos ausentes.
- JSON: `n8n/workflow_grano_hoja.json` y `tests/Grano-Hoja.postman_collection.json` se pueden analizar.
- Workflow n8n: 11 nodos; las conexiones principales apuntan a nodos existentes; el JSON no incorpora objetos de credenciales.
- `schema.sql`: define las cinco tablas esperadas y contiene datos de muestra para diez insumos, ocho productos, recetas y quince pedidos. Se revisó que subtotal + impuesto coincida con total en los quince pedidos sembrados.

## Comprobaciones que deben ejecutarse en el entorno del estudiante

En el entorno de generación no estaban disponibles `psql` ni Docker, y la instalación de dependencias no terminó dentro del tiempo disponible. Por eso no se afirma que se haya ejecutado una prueba integral contra PostgreSQL ni que Vite haya construido la aplicación en este entorno. Antes de entregar:

1. Carga `schema.sql` en PostgreSQL siguiendo el README.
2. Instala dependencias por separado en `backend/` y `frontend/`.
3. Ejecuta la colección `tests/Grano-Hoja.postman_collection.json` y guarda evidencia de los resultados.
4. En el navegador, recorre los CRUD y los casos de error 400/404/409.
5. Importa el workflow en tu versión de n8n, asigna la credencial del modelo, configura las URL de las herramientas y verifica el webhook con `curl`.

La estructura del proyecto está preparada para estas comprobaciones, pero la evidencia final debe proceder de las pruebas que ejecutes localmente.
