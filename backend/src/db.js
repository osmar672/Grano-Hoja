import pg from 'pg';
import { logError } from './utils/logger.js';

const { Pool } = pg;
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // Para servicios gestionados que requieran TLS, define PGSSL=true y configura certificados según el proveedor.
  ssl: process.env.PGSSL === 'true' ? { rejectUnauthorized: false } : undefined,
});

pool.on('error', (error) => {
  // No se registra el mensaje completo del driver porque puede contener metadatos internos.
  logError('database.pool_error', { errorName: error.name || 'DatabaseError', errorCode: error.code });
});
