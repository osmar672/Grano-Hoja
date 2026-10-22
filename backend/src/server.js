import 'dotenv/config';
import { app, sessionStore } from './app.js';
import { pool } from './db.js';
import { logInfo, logError } from './utils/logger.js';

const port = Number(process.env.PORT || 3001);
let server;
let shuttingDown = false;

async function start() {
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('PORT debe ser un puerto válido.');
  }
  // Fallar temprano evita que la API parezca saludable si MySQL o la tabla de sesiones no están listos.
  await pool.query('SELECT 1');
  if (typeof sessionStore.onReady === 'function') await sessionStore.onReady();
  server = await new Promise((resolve, reject) => {
    const listener = app.listen(port, '0.0.0.0', () => resolve(listener));
    listener.once('error', reject);
  });
  logInfo('server.started', { port });
}

async function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  logInfo('server.shutdown_started', { signal });
  const hardStop = setTimeout(() => {
    logError('server.shutdown_timeout', { signal });
    process.exit(1);
  }, 10000);
  hardStop.unref();
  try {
    if (server) await new Promise((resolve) => server.close(resolve));
    await pool.end();
    clearTimeout(hardStop);
    logInfo('server.shutdown_completed', { signal });
    process.exitCode = 0;
  } catch (error) {
    clearTimeout(hardStop);
    logError('server.shutdown_failed', { signal, errorName: error.name || 'Error', errorCode: error.code });
    process.exitCode = 1;
  }
}

process.on('SIGINT', () => { void shutdown('SIGINT'); });
process.on('SIGTERM', () => { void shutdown('SIGTERM'); });

try {
  await start();
} catch (error) {
  logError('server.start_failed', { errorName: error.name || 'Error', errorCode: error.code });
  process.stderr.write('No se pudo iniciar la API. Comprueba DB_HOST, DB_NAME, las credenciales de MySQL y la configuración de entorno.\n');
  await pool.end().catch(() => {});
  process.exitCode = 1;
}
