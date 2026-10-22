import { readFile, access } from 'node:fs/promises';
import { resolve } from 'node:path';
const root = resolve(import.meta.dirname, '..');
const read = (path) => readFile(resolve(root, path), 'utf8');
const checks = [];
function assertCheck(name, ok, detail) { checks.push({ name, ok: Boolean(ok), detail }); }
const apiClient = await read('frontend/src/services/api.js');
const loginPage = await read('frontend/src/pages/LoginPage.jsx');
const vite = await read('frontend/vite.config.js');
const app = await read('backend/src/app.js');
const backendPackage = JSON.parse(await read('backend/package.json'));
const compose = await read('compose.production.yaml');
const localCompose = await read('compose.yaml');
const nginx = await read('frontend/nginx.conf');
const caddy = await read('deploy/caddy/Caddyfile');
const productionSchema = await read('schema.production.sql');
const devSchema = await read('schema.sql');
const oauth = await read('backend/src/controllers/google-auth.controller.js');
const webhookController = await read('backend/src/controllers/agente.controller.js');
const reportRoutes = await read('backend/src/routes/reportes.routes.js');
const mysqlSession = backendPackage.dependencies['express-mysql-session'];
const mysqlDriver = backendPackage.dependencies.mysql2;
const workflow = JSON.parse(await read('n8n/workflow_raiz_madera.json'));
assertCheck('Frontend usa /api por defecto', /VITE_API_URL\s*\|\|\s*'\/api'/.test(apiClient), 'frontend/src/services/api.js');
assertCheck('Login OAuth utiliza la ruta API común', /VITE_API_URL\|\|'\/api'/.test(loginPage), 'frontend/src/pages/LoginPage.jsx');
assertCheck('Vite hace proxy /api al backend', vite.includes("'/api': { target: apiTarget"), 'frontend/vite.config.js');
assertCheck('Express monta auth/admin/catalog/orders/reports/agent', ['/api/auth','/api/admin','/api/productos','/api/pedidos','/api/resumen','/api/reportes','/api/agente'].every(route=>app.includes(`'${route}'`)), 'backend/src/app.js');
assertCheck('Backend usa mysql2 y session store MySQL', Boolean(mysqlDriver && mysqlSession) && !backendPackage.dependencies.pg && !backendPackage.dependencies['connect-pg-simple'], 'backend/package.json');
assertCheck('Session store conectado a MySQL', app.includes('express-mysql-session') && app.includes("tableName: 'user_sessions'"), 'backend/src/app.js');
assertCheck('Esquema de desarrollo usa MySQL/InnoDB', /AUTO_INCREMENT/.test(devSchema) && /ENGINE=InnoDB/.test(devSchema) && !/TIMESTAMPTZ|JSONB|SERIAL\s/i.test(devSchema), 'schema.sql');
assertCheck('Esquema de producción no borra ni incluye datos demo', !/^\s*DROP\s+TABLE|^\s*INSERT\s+INTO/im.test(productionSchema) && /ENGINE=InnoDB/.test(productionSchema), 'schema.production.sql');
assertCheck('Esquema de producción incluye la tabla de sesiones', /CREATE TABLE IF NOT EXISTS user_sessions/.test(productionSchema) && /session_id VARCHAR\(128\)/.test(productionSchema), 'schema.production.sql');
assertCheck('Esquema de producción incluye las seis tablas de la app', ['app_users','user_sessions','admin_audit_events','productos','pedidos','pedido_items'].every((table) => new RegExp('CREATE TABLE IF NOT EXISTS ' + table + '\\b').test(productionSchema)), 'schema.production.sql');
const prodDbBlock = compose.split(/\n  [a-zA-Z0-9_-]+:\n/)[1] || '';
assertCheck('MySQL producción no publica puertos y usa red privada', prodDbBlock.includes('image: mysql:8.4') && prodDbBlock.includes('networks: [data_net]') && !/^\s{4}ports:/m.test(prodDbBlock), 'compose.production.yaml');
assertCheck('MySQL local queda enlazado a localhost', localCompose.includes('mysql:8.4') && localCompose.includes('127.0.0.1:3306:3306'), 'compose.yaml');
assertCheck('Nginx pasa /api a Express', /location\s+\/api\/[\s\S]*?proxy_pass\s+http:\/\/backend:3001/.test(nginx), 'frontend/nginx.conf');
assertCheck('Caddy termina TLS para el dominio', caddy.includes('{$PUBLIC_DOMAIN}') && caddy.includes('reverse_proxy frontend:8080'), 'deploy/caddy/Caddyfile');
assertCheck('OAuth verifica ID token de Google', oauth.includes('GOOGLE_REDIRECT_URI') && oauth.includes('verifyIdToken'), 'google-auth.controller.js');
assertCheck('n8n obtiene datos solo a través de endpoints protegidos de la API', reportRoutes.includes('requireRoleOrServiceToken') && webhookController.includes('x-rm-webhook-token'), 'rutas y proxy del agente');
assertCheck('n8n local llama al backend host por URL local de Docker Desktop', workflow.nodes.filter(n=>n.type==='n8n-nodes-base.httpRequestTool').length >= 2 && workflow.nodes.filter(n=>n.type==='n8n-nodes-base.httpRequestTool').every(n=>n.parameters.url.startsWith('http://host.docker.internal:3001/api/reportes/')), 'n8n/workflow_raiz_madera.json');
assertCheck('La página llama al agente por proxy protegido de backend', (await read('frontend/src/services/agent.js')).includes("'/agente/sugerencia-compra'") && (await read('backend/src/routes/agente.routes.js')).includes('requireRole(ROLE.ADMIN, ROLE.MANAGER)'), 'frontend y backend agente');
for (const item of checks) process.stdout.write(`${item.ok?'PASS':'FAIL'} ${item.name}: ${item.detail}\n`);
if (checks.some(item=>!item.ok)) process.exitCode=1;
for (const lock of ['backend/package-lock.json','frontend/package-lock.json']) {
  try { await access(resolve(root,lock)); } catch { process.stdout.write(`WARN falta ${lock}; ejecuta npm install, revisa npm audit y versiona el lockfile antes de producción\n`); }
}
