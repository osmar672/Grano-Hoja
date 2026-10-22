import { readFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = (path) => readFile(resolve(root, path), 'utf8');
const results = [];
const check = (name, ok, detail = '') => results.push({ name, ok: Boolean(ok), detail });

const pkg = JSON.parse(await read('package.json'));
const vercel = JSON.parse(await read('vercel.json'));
const app = await read('backend/src/app.js');
const index = await read('index.js');
const prepare = await read('scripts/prepare-vercel-public.mjs');
const generated = await read('backend/src/generated-spa.js');
const envExample = await read('.env.vercel.example');
const db = await read('backend/src/db.js');
const csrf = await read('backend/src/middleware/csrfProtection.js');
const oauth = await read('backend/src/controllers/google-auth.controller.js');
const readme = await read('docs/VERCEL.md');

check('Vercel reconoce la app Express con default export', /export default app/.test(index));
check('Root package instala backend y frontend como workspaces', Array.isArray(pkg.workspaces) && pkg.workspaces.includes('backend') && pkg.workspaces.includes('frontend'));
check('Build de Vercel compila Vite y prepara public', /vercel-build/.test(vercel.buildCommand) && /prepare-vercel-public/.test(pkg.scripts['vercel-build']) && /cp\(dist, publicDir/.test(prepare));
check('Las rutas React Router devuelven el HTML SPA en Vercel', /app\.get\('\*'/.test(app) && /generatedSpaHtml/.test(app) && /generatedSpaHtml/.test(generated));
check('Las rutas API no se mezclan con el fallback SPA', /req\.path === '\/api' \|\| req\.path\.startsWith\('\/api\/'\)/.test(app));
check('El frontend usa API relativa /api por defecto', /VITE_API_URL\s*\|\|\s*'\/api'/.test(await read('frontend/src/services/api.js')));
check('Pool MySQL reducido para funciones serverless', /VERCEL.*\? 2 : 12/.test(db) && /SESSION_DB_POOL_MAX/.test(app));
check('La URL HTTPS deriva de variables Vercel si no es explícita', /VERCEL_URL/.test(await read('backend/src/utils/deploymentOrigin.js')) && /getPublicHttpsOrigin/.test(app));
check('CSRF permite origen productivo configurado', /getConfiguredOrigins/.test(csrf));
check('OAuth admite URL frontend derivada en Vercel', /getPublicHttpsOrigin/.test(oauth));
check('Entorno no contiene secretos reales', /GOOGLE_CLIENT_SECRET=TU_CLIENT_SECRET_DE_GOOGLE/.test(envExample) && /N8N_WEBHOOK_AUTH_TOKEN=GENERAR/.test(envExample));
check('Guía incluye base externa, OAuth y n8n', /MySQL administrado/.test(readme) && /Google OAuth/.test(readme) && /n8n/.test(readme));
check('Cabeceras de seguridad configuradas en Vercel', Array.isArray(vercel.headers) && vercel.headers[0].headers.some((h) => h.key === 'Content-Security-Policy') && vercel.headers[0].headers.some((h) => h.key === 'Strict-Transport-Security'));

for (const item of results) console.log(`${item.ok ? 'PASS' : 'FAIL'} ${item.name}${item.detail ? ` — ${item.detail}` : ''}`);
console.log(`\n${results.filter((x) => x.ok).length}/${results.length} verificaciones correctas.`);
if (results.some((x) => !x.ok)) process.exitCode = 1;
