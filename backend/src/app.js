import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import session from 'express-session';
import createMySQLSessionStore from 'express-mysql-session';
import { pool } from './db.js';
import { authRouter } from './routes/auth.routes.js';
import { productosRouter } from './routes/productos.routes.js';
import { insumosRouter } from './routes/insumos.routes.js';
import { pedidosRouter } from './routes/pedidos.routes.js';
import { resumenRouter } from './routes/resumen.routes.js';
import { reportesRouter } from './routes/reportes.routes.js';
import { agenteRouter } from './routes/agente.routes.js';
import { adminRouter } from './routes/admin.routes.js';
import { csrfProtection } from './middleware/csrfProtection.js';
import { requestLogger } from './middleware/requestLogger.js';
import { notFound, errorHandler } from './middleware/errorHandler.js';
import { getConfiguredOrigins, getPublicHttpsOrigin } from './utils/deploymentOrigin.js';

function failStartupConfig(variable, reason, message) {
  // El log nombra la variable y el tipo de fallo; nunca registra su valor.
  console.error(JSON.stringify({ level: 'error', event: 'config.startup_failed', variable, reason }));
  throw new Error(message);
}

const sessionSecret = process.env.SESSION_SECRET;
if (!sessionSecret) failStartupConfig('SESSION_SECRET', 'missing', 'Falta la variable obligatoria SESSION_SECRET. Configúrala en el entorno del backend.');
if (Buffer.byteLength(sessionSecret) < 32) failStartupConfig('SESSION_SECRET', 'invalid_length', 'SESSION_SECRET debe contener al menos 32 bytes aleatorios.');

const isProduction = process.env.NODE_ENV === 'production';
const isVercelRuntime = process.env.VERCEL === '1' || Boolean(process.env.VERCEL_URL);
const publicHttpsOrigin = getPublicHttpsOrigin();
const allowedOrigins = getConfiguredOrigins();
if (!allowedOrigins.length || allowedOrigins.includes('*')) {
  failStartupConfig('CORS_ORIGIN', !allowedOrigins.length ? 'missing_or_empty' : 'wildcard_forbidden', 'CORS_ORIGIN debe ser una lista explícita de orígenes; no se permite * con sesiones.');
}
if (isProduction) {
  if (!publicHttpsOrigin) {
    failStartupConfig('PUBLIC_HTTPS_ORIGIN', 'missing', 'Falta la variable obligatoria PUBLIC_HTTPS_ORIGIN en producción.');
  }
  let parsedPublicOrigin;
  try { parsedPublicOrigin = new URL(publicHttpsOrigin); }
  catch { failStartupConfig('PUBLIC_HTTPS_ORIGIN', 'invalid_url', 'PUBLIC_HTTPS_ORIGIN no es una URL válida.'); }
  if (parsedPublicOrigin.protocol !== 'https:' || parsedPublicOrigin.pathname !== '/' || parsedPublicOrigin.search || parsedPublicOrigin.hash) {
    failStartupConfig('PUBLIC_HTTPS_ORIGIN', 'invalid_origin', 'PUBLIC_HTTPS_ORIGIN debe ser un origen HTTPS sin ruta, consulta ni fragmento.');
  }
}

const sessionMinutes = Number(process.env.SESSION_MINUTES || 30);
if (!Number.isInteger(sessionMinutes) || sessionMinutes < 5 || sessionMinutes > 120) {
  throw new Error('SESSION_MINUTES debe ser un entero entre 5 y 120.');
}

export const app = express();
app.disable('x-powered-by');
app.use(requestLogger); // ID de correlación y logs HTTP sin query, cuerpos ni cabeceras sensibles.
const configuredProxyHops = process.env.TRUST_PROXY_HOPS;
const trustProxyHops = configuredProxyHops !== undefined
  ? Number(configuredProxyHops)
  : (process.env.TRUST_PROXY === 'true' || isVercelRuntime ? 1 : 0);
if (!Number.isInteger(trustProxyHops) || trustProxyHops < 0 || trustProxyHops > 5) {
  throw new Error('TRUST_PROXY_HOPS debe ser un entero entre 0 y 5.');
}
if (trustProxyHops > 0) {
  // Configúralo según el número exacto de proxies confiables; nunca uses true a ciegas.
  app.set('trust proxy', trustProxyHops);
}

// En producción, la URL destino sale de la configuración confiable, no de la cabecera Host del cliente.
app.use((req, res, next) => {
  if (!isProduction || req.secure) return next();
  // Construye el destino siempre desde el origen configurado para evitar open redirects con Host o //ruta.
  const secureTarget = new URL(publicHttpsOrigin);
  const originalUrl = String(req.originalUrl || '/');
  const queryIndex = originalUrl.indexOf('?');
  const rawPath = queryIndex === -1 ? originalUrl : originalUrl.slice(0, queryIndex);
  const rawQuery = queryIndex === -1 ? '' : originalUrl.slice(queryIndex);
  secureTarget.pathname = `/${rawPath.replace(/^\\+|^\/+/, '')}`;
  secureTarget.search = rawQuery;
  return res.redirect(308, secureTarget.toString());
});

const contentSecurityPolicy = {
  defaultSrc: ["'self'"],
  baseUri: ["'self'"],
  connectSrc: ["'self'"],
  fontSrc: ["'self'", 'data:'],
  formAction: ["'self'"],
  frameAncestors: ["'none'"],
  imgSrc: ["'self'", 'data:', 'blob:'],
  objectSrc: ["'none'"],
  scriptSrc: ["'self'"],
  scriptSrcAttr: ["'none'"],
  // Se conserva inline para compatibilidad con estilos dinámicos existentes; conviene eliminarlo en una fase futura.
  styleSrc: ["'self'", "'unsafe-inline'"],
  upgradeInsecureRequests: isProduction ? [] : null,
};

app.use(helmet({
  contentSecurityPolicy: { directives: contentSecurityPolicy },
  // HSTS solo se activa en producción; no se activa en localhost HTTP.
  hsts: isProduction ? { maxAge: 15_552_000, includeSubDomains: false, preload: false } : false,
  crossOriginEmbedderPolicy: false,
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
}));
app.use((_req, res, next) => {
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  next();
});

app.use(cors({
  origin(origin, callback) {
    // Se permiten solicitudes sin Origin para herramientas CLI; las mutaciones siguen exigiendo token CSRF.
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    return callback(null, false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'X-CSRF-Token'],
  maxAge: 600,
}));
app.use(express.json({ limit: '1mb', strict: true, type: 'application/json' }));

const MySQLStore = createMySQLSessionStore(session);
export const sessionStore = new MySQLStore({
  host: process.env.DB_HOST || '127.0.0.1',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || 'grano_app',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'grano_hoja',
  timezone: 'Z',
  clearExpired: true,
  checkExpirationInterval: 15 * 60 * 1000,
  connectionLimit: Math.max(1, Math.min(4, Number(process.env.SESSION_DB_POOL_MAX || (isVercelRuntime ? 2 : 6)))),
  expiration: Number(process.env.SESSION_MINUTES || 30) * 60 * 1000,
  createDatabaseTable: false,
  schema: { tableName: 'user_sessions', columnNames: { session_id: 'session_id', expires: 'expires', data: 'data' } },
});
app.use(session({
  name: process.env.SESSION_COOKIE_NAME || 'gh.sid',
  secret: sessionSecret,
  store: sessionStore,
  resave: false,
  saveUninitialized: false,
  rolling: true,
  proxy: trustProxyHops > 0,
  cookie: {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax', // Requerido para que el callback GET de OAuth reciba la cookie de sesión.
    maxAge: sessionMinutes * 60 * 1000,
    path: '/',
  },
}));

// Todas las operaciones mutables (incluido el login tradicional) requieren token CSRF por sesión.
// El callback OAuth es GET y valida state, nonce y PKCE en su propio controlador.
app.use(csrfProtection);

app.get('/api/health', (_req, res) => res.set('Cache-Control', 'no-store').json({ ok: true, message: 'API Grano & Hoja activa' }));
app.get('/api/ready', async (_req, res, next) => {
  try {
    await pool.query('SELECT 1');
    return res.set('Cache-Control', 'no-store').json({ ok: true, database: 'ready' });
  } catch (error) {
    return next(error);
  }
});
app.use('/api/auth', authRouter);
app.use('/api/admin', adminRouter);

// Cada router aplica autenticación, permisos por rol y validación según el método y recurso.
app.use('/api/productos', productosRouter);
app.use('/api/insumos', insumosRouter);
app.use('/api/pedidos', pedidosRouter);
app.use('/api/resumen', resumenRouter);
app.use('/api/reportes', reportesRouter);
app.use('/api/agente', agenteRouter);

// El frontend se sirve en el servicio Vercel `frontend`; este Express solo responde a rutas /api.
app.use(notFound);
app.use(errorHandler);
