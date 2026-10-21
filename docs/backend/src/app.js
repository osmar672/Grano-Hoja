import express from 'express';
import cors from 'cors';
import { insumosRouter } from './routes/insumos.routes.js';
import { productosRouter } from './routes/productos.routes.js';
import { pedidosRouter } from './routes/pedidos.routes.js';
import { resumenRouter } from './routes/resumen.routes.js';
import { reportesRouter } from './routes/reportes.routes.js';
import { notFound, errorHandler } from './middleware/errorHandler.js';

export const app = express();
const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:5173').split(',').map((origin) => origin.trim());
app.use(cors({ origin(origin, callback) {
  if (!origin || allowedOrigins.includes('*') || allowedOrigins.includes(origin)) return callback(null, true);
  const error = new Error('Origen CORS no permitido'); error.status = 403; return callback(error);
} }));
app.use(express.json({ limit: '1mb' }));
app.get('/api/health', (_req, res) => res.json({ ok: true, message: 'API Grano & Hoja activa' }));
app.use('/api/insumos', insumosRouter);
app.use('/api/productos', productosRouter);
app.use('/api/pedidos', pedidosRouter);
app.use('/api/resumen', resumenRouter);
app.use('/api/reportes', reportesRouter);
app.use(notFound);
app.use(errorHandler);
