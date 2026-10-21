import 'dotenv/config';
import { app } from './app.js';
import { pool } from './db.js';
import { logInfo, logError } from './utils/logger.js';

const port = Number(process.env.PORT || 3001);
const server = app.listen(port, () => logInfo('server.started', { port }));
server.on('error', (error) => {
  logError('server.start_failed', { errorName: error.name || 'Error', errorCode: error.code });
  process.exitCode = 1;
});

async function shutdown(signal) {
  logInfo('server.shutdown_started', { signal });
  server.close(async () => {
    try {
      await pool.end();
      logInfo('server.shutdown_completed', { signal });
      process.exit(0);
    } catch (error) {
      logError('server.shutdown_failed', { signal, errorName: error.name || 'Error', errorCode: error.code });
      process.exit(1);
    }
  });
}
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
