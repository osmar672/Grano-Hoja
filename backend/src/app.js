import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import session from 'express-session';
import connectPgSimple from 'connect-pg-simple';
import { pool } from './db.js';
import { authRouter } from './routes/auth.routes.js';
import { productosRouter } from './routes/productos.routes.js';
import { pedidosRouter } from './routes/pedidos.routes.js';
import { resumenRouter } from './routes/resumen.routes.js';
import { reportesRouter } from './routes/reportes.routes.js';
import { agenteRouter } from './routes/agente.routes.js';
import { csrfProtection } from './middleware/csrfProtection.js';
import { notFound, errorHandler } from './middleware/errorHandler.js';

const sessionSecret = process.env.SESSION_SECRET;
if (!sessionSecret || Buffer.byteLength(sessionSecret) < 32) {
  throw new Error('SESSION_SECRET debe contener al menos 32 bytes aleatorios. Revisa backend/.env.example.');
}

const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:5173')
  .split(',').map((origin) => origin.trim()).filter(Boolean);
if (!allowedOrigins.length || allowedOrigins.includes('*')) {
  throw new Error('CORS_ORIGIN debe ser una lista explícita de orígenes; no se permite * con sesiones.');
}

const isProduction = process.env.NODE_ENV === 'production';
const publicHttpsOrigin = process.env.PUBLIC_HTTPS_ORIGIN;
if (isProduction) {
  if (!publicHttpsOrigin) {
    throw new Error('PUBLIC_HTTPS_ORIGIN es obligatorio en producción, por ejemplo https://app.tudominio.com.');
  }
  let parsedPublicOrigin;
  try { parsedPublicOrigin = new URL(publicHttpsOrigin); }
  catch { throw new Error('PUBLIC_HTTPS_ORIGIN no es una URL válida.'); }
  if (parsedPublicOrigin.protocol !== 'https:' || parsedPublicOrigin.pathname !== '/' || parsedPublicOrigin.search || parsedPublicOrigin.hash) {
    throw new Error('PUBLIC_HTTPS_ORIGIN debe ser un origen HTTPS sin ruta, consulta ni fragmento.');
  }
}

const sessionMinutes = Number(process.env.SESSION_MINUTES || 30);
if (!Number.isInteger(sessionMinutes) || sessionMinutes < 5 || sessionMinutes > 120) {
  throw new Error('SESSION_MINUTES debe ser un entero entre 5 y 120.');
}

export const app = express();
app.disable('x-powered-by');
if (process.env.TRUST_PROXY === 'true') {
  // Úsalo únicamente si existe un proxy inverso confiable delante de Express.
  app.set('trust proxy', 1);
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

const PgSessionStore = connectPgSimple(session);
app.use(session({
  name: process.env.SESSION_COOKIE_NAME || 'rm.sid',
  secret: sessionSecret,
  store: new PgSessionStore({
    pool,
    tableName: 'user_sessions',
    createTableIfMissing: false,
    pruneSessionInterval: 900,
  }),
  resave: false,
  saveUninitialized: false,
  rolling: true,
  proxy: process.env.TRUST_PROXY === 'true',
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

app.get('/api/health', (_req, res) => res.json({ ok: true, message: 'API Raíz & Madera activa' }));
app.use('/api/auth', authRouter);

// Cada router aplica autenticación, permisos por rol y validación según el método y recurso.
app.use('/api/productos', productosRouter);
app.use('/api/pedidos', pedidosRouter);
app.use('/api/resumen', resumenRouter);
app.use('/api/reportes', reportesRouter);
app.use('/api/agente', agenteRouter);

app.use(notFound);
app.use(errorHandler);
