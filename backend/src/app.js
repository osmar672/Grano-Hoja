import express from 'express';
import cors from 'cors';
import session from 'express-session';
import connectPgSimple from 'connect-pg-simple';
import { pool } from './db.js';
import { authRouter } from './routes/auth.routes.js';
import { productosRouter } from './routes/productos.routes.js';
import { pedidosRouter } from './routes/pedidos.routes.js';
import { resumenRouter } from './routes/resumen.routes.js';
import { reportesRouter } from './routes/reportes.routes.js';
import { agenteRouter } from './routes/agente.routes.js';
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

const sessionMinutes = Number(process.env.SESSION_MINUTES || 30);
if (!Number.isInteger(sessionMinutes) || sessionMinutes < 5 || sessionMinutes > 120) {
  throw new Error('SESSION_MINUTES debe ser un entero entre 5 y 120.');
}

export const app = express();
if (process.env.TRUST_PROXY === 'true') app.set('trust proxy', 1);

app.use(cors({
  origin(origin, callback) {
    // Las herramientas locales sin cabecera Origin pueden consultar la API directamente.
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    return callback(null, false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type'],
}));
app.use(express.json({ limit: '1mb' }));

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
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: sessionMinutes * 60 * 1000,
    path: '/',
  },
}));

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
