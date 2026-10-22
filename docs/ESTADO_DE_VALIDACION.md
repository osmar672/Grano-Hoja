# Estado de validación — Grano & Hoja

## Línea base limpia (antes de las reparaciones)

Las salidas detalladas de línea base y verificación final se conservan en `audit-results/before/commands.log` y `audit-results/after/commands.log` dentro del repositorio. El intento de instalar dependencias no pudo completarse por un problema de resolución DNS: `curl` devolvió `Could not resolve host: registry.npmjs.org` (código 6). La caché de npm estaba vacía. Node local era `v22.16.0`; Node 24 no estaba instalado.

Con los módulos desactualizados incluidos en el ZIP inicial:

- `backend/npm run check`: sintaxis correcta.
- `backend/npm run check:integration`: comprobaciones originales pasaban, pero no detectaban todos los contratos omitidos.
- `backend/npm test`: 28 correctas, 1 fallida por el PATCH vacío (`backend/tests/validation.test.js`).
- Audit: no se obtuvo resultado de vulnerabilidades fiable durante la instalación interrumpida; no debe interpretarse como un audit limpio.
- Build del frontend: falló con los módulos incluidos por discrepancia de versión de Vite (instalado 6.4.5 frente a 8.3.5 declarado), permiso del ejecutable y binario opcional de Rollup ausente en Linux.
- `scripts/check-vercel.mjs`: 19/20 verificaciones por restos del empaquetado SPA anterior.

## Después de las reparaciones — verificaciones ejecutadas con módulos presentes

| Comando | Resultado observado |
|---|---|
| `node scripts/check-vercel.mjs` | 20/20 PASS. |
| `node scripts/check-integration.mjs` | 33/33 PASS. |
| `cd backend; npm run check` | Sintaxis verificada en 52 archivos. |
| `cd backend; npm run check:integration` | 33/33 comprobaciones estáticas PASS. |
| `cd backend; npm test` | 39/39 pruebas PASS. |
| Parser Babel para módulos frontend | 34/34 módulos JSX/JS pudieron parsearse. |
| JSON de workflow n8n y colecciones Postman | parseados correctamente. |
| Protección de `backend/.env` | Git lo ignora y no está versionado; no se inspeccionó ni se imprimió su contenido durante la verificación final. |

## No verificado en este entorno

- **Instalación limpia y lockfiles:** los `package-lock.json` de backend y frontend no coinciden todavía completamente con las versiones declaradas en los `package.json` (por ejemplo Vite declarado 8.3.5 frente a 6.4.5 en el lock presente). No se pudo regenerar el grafo de dependencias porque el DNS al registro npm falló. Se cambiaron solo los nombres de paquete; no se ha fingido una instalación reproducible.
- **`npm audit --audit-level=moderate`:** sin consulta efectiva al registro npm, no hay resultado fiable ni lista definitiva de vulnerabilidades.
- **Build final Vite con dependencias declaradas:** no verificado por el bloqueo de npm; el intento con `node_modules` incluidos no es una verificación válida de la instalación declarada.
- **MySQL:** no hay cliente/servidor MySQL disponible. No se aplicó `004_insumos_recetas.sql`, ni se verificaron restricciones, locks, transacciones, rollback o concurrencia reales.
- **Vercel real:** no hay acceso al proyecto ni a sus variables/logs; solo se revisaron la configuración versionada y los verificadores locales.
- **Google OAuth real:** no se pudo completar un login/registro con credenciales de Google.
- **n8n real:** el workflow JSON se parseó y verificó estáticamente; no se importó/ejecutó en una instancia con sus credenciales reales.
- **PowerShell y empaquetado:** no hay `pwsh` disponible, por lo que `scripts/Empaquetar-Proyecto.ps1` no se ejecutó en este entorno.

## Cómo cerrar estos pendientes

1. En un equipo con Internet y Node 24, ejecuta los comandos de `tests/README.md` y la secuencia CI descrita en `../.github/workflows/security.yml`. Regenera/versiona lockfiles solo después de verificar las versiones resultantes y revisar el diff.
2. Aplica la migración 004 tras respaldo a una base MySQL compatible y completa el smoke manual de `tests/README.md`.
3. En Vercel, revisa variables y Runtime Logs según `VERCEL_SERVICES.md`; cambia valores solo desde Settings y crea un deployment nuevo.
4. Prueba Google OAuth con cuenta de prueba y el callback exacto.
5. Importa el workflow oficial, crea credenciales Header Auth/modelo y ejecuta una sugerencia desde la UI.
