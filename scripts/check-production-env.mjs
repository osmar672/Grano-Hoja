import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
const file = resolve(process.argv[2] || '.env.production');
const source = await readFile(file, 'utf8');
const env = {};
for (const rawLine of source.split(/\r?\n/)) {
  const line = rawLine.trim();
  if (!line || line.startsWith('#')) continue;
  const match = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
  if (!match) throw new Error(`Línea inválida en ${file}: ${line.split('=')[0]}`);
  env[match[1]] = match[2].trim().replace(/^(['"])(.*)\1$/, '$2');
}
const errors = [];
const required = ['PUBLIC_DOMAIN','PUBLIC_HTTPS_ORIGIN','CORS_ORIGIN','FRONTEND_URL','MYSQL_DATABASE','MYSQL_ROOT_PASSWORD','APP_DB_USER','APP_DB_PASSWORD','SESSION_SECRET','GOOGLE_CLIENT_ID','GOOGLE_CLIENT_SECRET','N8N_WEBHOOK_URL','N8N_API_BASE_URL','N8N_WEBHOOK_AUTH_TOKEN','N8N_API_SERVICE_TOKEN','GOOGLE_REDIRECT_URI','SEED_ADMIN_EMAIL','SEED_ADMIN_NAME','SEED_ADMIN_PASSWORD','SEED_MANAGER_EMAIL','SEED_MANAGER_NAME','SEED_MANAGER_PASSWORD','SEED_CASHIER_EMAIL','SEED_CASHIER_NAME','SEED_CASHIER_PASSWORD'];
for (const key of required) if (!env[key] || /CAMBIAR|REEMPLAZAR|tu-dominio\.com|example/i.test(env[key])) errors.push(`${key} sigue vacío o contiene un marcador de ejemplo`);
const domain = env.PUBLIC_DOMAIN || '';
if (!/^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/i.test(domain)) errors.push('PUBLIC_DOMAIN debe ser un dominio público válido, sin https:// ni ruta');
for (const key of ['MYSQL_ROOT_PASSWORD','APP_DB_PASSWORD','SESSION_SECRET','N8N_WEBHOOK_AUTH_TOKEN','N8N_API_SERVICE_TOKEN']) if (env[key] && env[key].length < 32) errors.push(`${key} debe tener al menos 32 caracteres`);
if (env.APP_DB_PASSWORD && !/^[A-Za-z0-9_-]{32,}$/.test(env.APP_DB_PASSWORD)) errors.push('APP_DB_PASSWORD solo puede usar letras, números, guion y guion bajo (mínimo 32 caracteres)');
if (env.MYSQL_DATABASE && !/^[A-Za-z0-9_]+$/.test(env.MYSQL_DATABASE)) errors.push('MYSQL_DATABASE solo puede usar letras, números y guion bajo');
if (env.APP_DB_USER && !/^[A-Za-z0-9_]+$/.test(env.APP_DB_USER)) errors.push('APP_DB_USER solo puede usar letras, números y guion bajo');
if (env.N8N_WEBHOOK_AUTH_TOKEN && env.N8N_WEBHOOK_AUTH_TOKEN === env.N8N_API_SERVICE_TOKEN) errors.push('Los dos tokens de n8n deben ser diferentes');
const expectedOrigin = `https://${domain}`;
for (const key of ['PUBLIC_HTTPS_ORIGIN','CORS_ORIGIN','FRONTEND_URL']) if (env[key] && env[key] !== expectedOrigin) errors.push(`${key} debe coincidir con ${expectedOrigin}`);
if (env.GOOGLE_REDIRECT_URI && env.GOOGLE_REDIRECT_URI !== `${expectedOrigin}/api/auth/google/callback`) errors.push(`GOOGLE_REDIRECT_URI debe ser ${expectedOrigin}/api/auth/google/callback; añádela al .env.production`);
for (const key of ['SEED_ADMIN_PASSWORD','SEED_MANAGER_PASSWORD','SEED_CASHIER_PASSWORD']) {
  const value = env[key] || '';
  if (Buffer.byteLength(value) < 12 || Buffer.byteLength(value) > 72 || !/[a-z]/.test(value) || !/[A-Z]/.test(value) || !/\d/.test(value)) errors.push(`${key} debe tener 12-72 bytes e incluir minúscula, mayúscula y número`);
}
if (new Set(['SEED_ADMIN_PASSWORD','SEED_MANAGER_PASSWORD','SEED_CASHIER_PASSWORD'].map((key)=>env[key]).filter(Boolean)).size !== 3) errors.push('Las tres contraseñas iniciales deben ser distintas');
try {
  const api = new URL(env.N8N_API_BASE_URL);
  if (api.protocol !== 'https:' || api.origin !== expectedOrigin || api.pathname !== '/' || api.search || api.hash) errors.push('N8N_API_BASE_URL debe ser el origen HTTPS público de la API, sin ruta, consulta ni fragmento');
} catch { if (env.N8N_API_BASE_URL) errors.push('N8N_API_BASE_URL no es una URL válida'); }
try {
  const u = new URL(env.N8N_WEBHOOK_URL);
  if (u.protocol !== 'https:' || ['localhost','127.0.0.1','::1'].includes(u.hostname)) errors.push('N8N_WEBHOOK_URL debe ser HTTPS y no localhost en producción');
} catch { if (env.N8N_WEBHOOK_URL) errors.push('N8N_WEBHOOK_URL no es una URL válida'); }
if (errors.length) { process.stderr.write(`Configuración de producción incompleta (${errors.length}):\n- ${errors.join('\n- ')}\n`); process.exit(1); }
process.stdout.write(`Configuración validada: ${file}. No se imprimieron secretos.\n`);
