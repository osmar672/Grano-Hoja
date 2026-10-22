import { readFile, access } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = (path) => readFile(resolve(root, path), 'utf8');
const exists = async (path) => { try { await access(resolve(root, path)); return true; } catch { return false; } };
const checks = [];
const check = (name, ok, detail = '') => checks.push({ name, ok: Boolean(ok), detail });

const config = JSON.parse(await read('vercel.json'));
const pkg = JSON.parse(await read('package.json'));
const backendPkg = JSON.parse(await read('backend/package.json'));
const frontendPkg = JSON.parse(await read('frontend/package.json'));
const backendApp = await read('backend/src/app.js');
const backendEntry = await read('backend/index.js');
const frontendApi = await read('frontend/src/services/api.js');
const agentController = await read('backend/src/controllers/agente.controller.js');
const envExample = await read('.env.vercel.example');
const docs = await read('docs/VERCEL_SERVICES.md');

check('Config usa Vercel Services', config.services && typeof config.services === 'object');
check('Los nombres de servicio son backend y frontend', JSON.stringify(Object.keys(config.services || {}).sort()) === JSON.stringify(['backend', 'frontend']));
check('Backend usa Express y entrypoint local', config.services?.backend?.root === 'backend/' && config.services?.backend?.framework === 'express' && config.services?.backend?.entrypoint === 'index.js' && await exists('backend/index.js'));
check('Backend instala sus dependencias en su directorio', config.services?.backend?.installCommand === 'npm install' && Boolean(backendPkg.dependencies?.express) && Boolean(backendPkg.dependencies?.mysql2));
check('Backend exporta una app Express como default', /export default app/.test(backendEntry) && /export const app = express\(\)/.test(backendApp));
check('Backend conserva máximo de ejecución por función', config.services?.backend?.functions?.['index.js']?.maxDuration === 60);
check('Frontend usa Vite, construye dist y tiene fallback SPA', config.services?.frontend?.root === 'frontend/' && config.services?.frontend?.framework === 'vite' && config.services?.frontend?.buildCommand === 'npm run build' && config.services?.frontend?.outputDirectory === 'dist' && config.services?.frontend?.rewrites?.some((r) => r.source === '/(.*)' && r.destination === '/index.html'));
const invalidTopLevel = ['framework', 'installCommand', 'buildCommand', 'devCommand', 'ignoreCommand', 'outputDirectory', 'functions'];
check('No hay opciones de build/runtime inválidas en el nivel superior', invalidTopLevel.every((key) => !(key in config)));
check('Rewrite público /api va a backend antes del catch-all', config.rewrites?.[0]?.source === '/api/(.*)' && config.rewrites?.[0]?.destination?.service === 'backend' && config.rewrites?.[1]?.source === '/(.*)' && config.rewrites?.[1]?.destination?.service === 'frontend');
check('Frontend usa el mismo dominio y /api como valor por defecto', /VITE_API_URL\s*\|\|\s*'\/api'/.test(frontendApi));
check('Express mantiene el prefijo /api en sus rutas', ['/api/auth', '/api/admin', '/api/productos', '/api/pedidos', '/api/resumen', '/api/reportes', '/api/agente'].every((route) => backendApp.includes(`'${route}'`)));
check('Cabeceras globales de seguridad están en el config', Array.isArray(config.headers) && config.headers[0]?.headers?.some((h) => h.key === 'Content-Security-Policy') && config.headers[0]?.headers?.some((h) => h.key === 'Strict-Transport-Security') && config.headers[0]?.headers?.some((h) => h.key === 'X-Content-Type-Options'));
check('MySQL y n8n se configuran como servicios externos', /DB_HOST=HOST_PUBLICO_DE_MYSQL/.test(envExample) && /N8N_WEBHOOK_URL=https:/.test(envExample) && /N8N_API_BASE_URL=https:/.test(envExample));
check('n8n recibe el origen de API validado desde Express', /apiBaseUrl: config\.apiBaseUrl/.test(agentController) && /N8N_API_BASE_URL/.test(agentController));
check('No se declara binding ficticio entre frontend estático y backend', !config.services.frontend.bindings && !config.services.backend.bindings && /no hay actualmente un binding válido|no se declaran bindings|no se añade ningún binding/i.test(docs));
check('Guía explica el preset Services y el alcance de rutas públicas', /Framework Preset.*Services/i.test(docs) && /\/api\/\*/.test(docs) && /frontend.*pública/i.test(docs));
check('El despliegue Services no depende del empaquetado SPA histórico', !(await exists('scripts/prepare-vercel-public.mjs')) && !(await exists('backend/src/generated-spa.js')) && !/prepare-vercel-public|generated-spa|vercel-build/.test(await read('vercel.json')) && /buildCommand.*npm run build/.test(await read('frontend/vercel.json')));
check('Las cabeceras no introducen URL o secretos', !JSON.stringify(config).includes('GOOGLE_CLIENT_SECRET') && !JSON.stringify(config).includes('N8N_WEBHOOK_AUTH_TOKEN'));
check('Script de validación está publicado en package.json', pkg.scripts?.['check:vercel'] === 'node scripts/check-vercel.mjs');
check('Backend y frontend tienen sus propios package.json', await exists('backend/package.json') && await exists('frontend/package.json') && backendPkg.name === 'grano-hoja-api' && frontendPkg.name === 'grano-hoja-frontend');

for (const item of checks) process.stdout.write(`${item.ok ? 'PASS' : 'FAIL'} ${item.name}${item.detail ? ` — ${item.detail}` : ''}\n`);
process.stdout.write(`\n${checks.filter((item) => item.ok).length}/${checks.length} verificaciones correctas.\n`);
if (checks.some((item) => !item.ok)) process.exitCode = 1;
