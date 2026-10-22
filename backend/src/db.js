import mysql from 'mysql2/promise';
import { readFileSync } from 'node:fs';
import { logError } from './utils/logger.js';

function sslConfig() {
  if (process.env.DB_SSL !== 'true') return undefined;
  if (process.env.DB_SSL_CA_FILE) return { ca: readFileSync(process.env.DB_SSL_CA_FILE, 'utf8'), rejectUnauthorized: true };
  return { rejectUnauthorized: true };
}

const rawPool = mysql.createPool({
  host: process.env.DB_HOST || '127.0.0.1',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || 'raiz_app',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'raiz_madera',
  waitForConnections: true,
  connectionLimit: Math.max(1, Math.min(12, Number(process.env.DB_POOL_MAX || (process.env.VERCEL === '1' ? 2 : 12)))),
  queueLimit: 0,
  connectTimeout: Number(process.env.DB_CONNECT_TIMEOUT_MS || 5000),
  timezone: 'Z',
  charset: 'utf8mb4',
  ssl: sslConfig(),
  typeCast(field, next) {
    if (field.type === 'TINY' && field.length === 1) {
      const value = field.string();
      return value === null ? null : value === '1';
    }
    return next();
  },
});

// Conserva una interfaz simple (rows/rowCount) para que servicios y controladores lean resultados igual.
function normalizeSql(sql, params = []) {
  const ordered = [];
  const translated = String(sql).replace(/\$(\d+)/g, (_match, indexText) => {
    const index = Number(indexText) - 1;
    if (index < 0 || index >= params.length) throw new Error('Parámetros SQL inválidos');
    ordered.push(params[index]);
    return '?';
  });
  return { sql: translated, params: ordered.length ? ordered : params };
}

async function run(executor, sql, params = []) {
  const command = String(sql).trim().toUpperCase();
  if (command === 'BEGIN' || command === 'BEGIN TRANSACTION') {
    await executor.beginTransaction();
    return { rows: [], rowCount: 0 };
  }
  if (command === 'COMMIT') {
    await executor.commit();
    return { rows: [], rowCount: 0 };
  }
  if (command === 'ROLLBACK') {
    await executor.rollback();
    return { rows: [], rowCount: 0 };
  }
  const normalized = normalizeSql(sql, params);
  const [result] = await executor.execute(normalized.sql, normalized.params);
  if (Array.isArray(result)) return { rows: result, rowCount: result.length };
  return {
    rows: [],
    rowCount: Number(result.affectedRows ?? result.changedRows ?? 0),
    insertId: result.insertId ? Number(result.insertId) : undefined,
    warningStatus: result.warningStatus,
  };
}

export const pool = {
  query: (sql, params = []) => run(rawPool, sql, params),
  async connect() {
    const connection = await rawPool.getConnection();
    return {
      query: (sql, params = []) => run(connection, sql, params),
      release: () => connection.release(),
    };
  },
  end: () => rawPool.end(),
};

rawPool.on('error', (error) => {
  logError('database.pool_error', { errorName: error.name || 'DatabaseError', errorCode: error.code });
});
