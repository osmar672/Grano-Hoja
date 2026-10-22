const base = (process.env.BASE_URL || '').replace(/\/$/, '');
if (!base) {
  process.stderr.write('Uso: BASE_URL=https://tu-dominio.com node scripts/production-smoke.mjs\n');
  process.exit(2);
}
const parsed = new URL(base);
if (parsed.protocol !== 'https:' && process.env.ALLOW_HTTP_SMOKE !== 'true') {
  process.stderr.write('La prueba de producción exige HTTPS. Para localhost únicamente, define ALLOW_HTTP_SMOKE=true.\n');
  process.exit(2);
}
const checks = [];
async function check(name, path, validate) {
  try {
    const response = await fetch(`${base}${path}`, { redirect: 'manual', signal: AbortSignal.timeout(10000) });
    const body = await response.text();
    const result = validate(response, body);
    checks.push({ name, ok: result, detail: `HTTP ${response.status}` });
  } catch (error) {
    checks.push({ name, ok: false, detail: error.name === 'AbortError' ? 'timeout' : 'no se pudo conectar' });
  }
}
await check('Health', '/api/health', (r,b) => r.status === 200 && b.includes('API Raíz & Madera activa'));
await check('Readiness + MySQL', '/api/ready', (r,b) => r.status === 200 && b.includes('"database":"ready"'));
await check('Cabecera X-Content-Type-Options', '/api/health', (r) => r.headers.get('x-content-type-options') === 'nosniff');
await check('Sin X-Powered-By', '/api/health', (r) => !r.headers.has('x-powered-by'));
await check('HSTS', '/api/health', (r) => parsed.protocol !== 'https:' || Boolean(r.headers.get('strict-transport-security')));
for (const item of checks) process.stdout.write(`${item.ok ? 'PASS' : 'FAIL'} ${item.name}: ${item.detail}\n`);
if (checks.some((item) => !item.ok)) process.exitCode = 1;
