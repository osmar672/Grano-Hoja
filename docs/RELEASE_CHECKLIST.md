# Checklist de salida a producción — Grano & Hoja

No declares el servicio listo hasta completar las comprobaciones que requieren infraestructura real.

## A. Instalación y CI

- [ ] Con DNS/red a npm disponible, ejecutar `npm install --no-fund --no-audit` en `backend/` y `frontend/` y versionar lockfiles consistentes con cada `package.json`.
- [ ] Backend: `npm audit --audit-level=moderate`, `npm run check`, `npm run check:integration`, `npm test`.
- [ ] Frontend: `npm audit --audit-level=moderate`, `VITE_API_URL=/api npm run build` (en PowerShell usa `$env:VITE_API_URL='/api'`).
- [ ] Revisar vulnerabilidades auditadas. No ejecutar `npm audit fix --force` ni introducir actualizaciones mayores no aprobadas.
- [ ] `node scripts/check-vercel.mjs` y `node scripts/check-integration.mjs` pasan.

## B. Base de datos e inventario

- [ ] Crear backup probado antes de migrar una base existente.
- [ ] Ejecutar `schema.production.sql` solo en una base nueva; no en una base real existente.
- [ ] Para una base existente compatible, revisar y aplicar `backend/migrations/004_insumos_recetas.sql` después de respaldar y comprobar migraciones anteriores.
- [ ] Verificar con MySQL real las restricciones, stock decimal, receta, consumo por insumo, conflictos 409, rollback, concurrencia y movimientos de restitución.
- [ ] Definir receta para cada producto que deba consumir ingredientes. Los productos sin receta no consumen ingredientes ni el campo legado `productos.stock`.

## C. Vercel, sesión y OAuth

- [ ] Configurar las variables de `.env.vercel.example` para el entorno de producción y revisar `PUBLIC_HTTPS_ORIGIN`, `CORS_ORIGIN` y `FRONTEND_URL`.
- [ ] Configurar MySQL remoto con TLS cuando corresponda y verificar `/api/ready`.
- [ ] Configurar Google Cloud con callback exacto `https://TU_DOMINIO/api/auth/google/callback` y probar login/registro/logout con un usuario de prueba.
- [ ] Revisar Vercel Runtime Logs y Build Logs; no diagnosticar `FUNCTION_INVOCATION_FAILED` sin el registro de ejecución.
- [ ] Volver a desplegar después de cambiar variables de entorno.

## D. n8n y seguridad operacional

- [ ] Importar `n8n/workflow_grano_hoja.json` en la instancia oficial; configurar credencial de modelo y ambos headers de auth.
- [ ] Verificar `N8N_WEBHOOK_URL`, `N8N_API_BASE_URL` y dos tokens distintos.
- [ ] Confirmar que n8n puede consultar `GET /api/insumos/bajo-minimo`, `/api/reportes/ventas-semana` y `/api/reportes/consumo-insumos-semana`.
- [ ] Configurar y restaurar un backup cifrado en base aislada.
- [ ] Definir retención/alertas de logs, política de privacidad y proceso de incidente.
- [ ] Ejecutar pruebas HTTPS, roles, CSRF, cookies, rate limit y escáner de seguridad desde el entorno publicado.

## Estado comprobado en la auditoría

Verificados con módulos disponibles: 39/39 tests backend, sintaxis de 52 archivos, 31/31 contratos estáticos de integración, 20/20 checks de Vercel y parseo JSON del workflow/colecciones Postman. No verificados: instalación limpia, auditoría npm online, build completo, MySQL real, concurrencia real, Vercel publicado, Google OAuth real, credenciales/ejecución n8n y prueba del empaquetador PowerShell (PowerShell no está instalado en este entorno).
