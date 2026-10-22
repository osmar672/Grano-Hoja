# Archivos heredados — no desplegar

Esta carpeta conserva archivos que se verificaron sin referencias en configuración activa antes de moverlos. No se han borrado; se mantienen para consulta histórica y reversión manual.

- `n8n/workflow_raiz_madera.json`: workflow de la marca anterior. El workflow oficial actual es `n8n/workflow_grano_hoja.json`.
- `backend/src/generated-spa.js` y `scripts/prepare-vercel-public.mjs`: empaquetado SPA antiguo; el `vercel.json` actual publica el backend y frontend como Vercel Services y los checks confirman que no los usa.

- `frontend/public/raiz-madera-logo.svg`: logotipo de la identidad visual anterior; se conserva para referencia, el activo es `frontend/public/grano-hoja-logo.svg`.
- `deploy/legacy/postgres/`: scripts anteriores de PostgreSQL; no se referenciaban desde configuración activa al moverlos.
