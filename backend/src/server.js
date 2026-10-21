import 'dotenv/config';
import { app } from './app.js';
import { pool } from './db.js';

const port = Number(process.env.PORT || 3001);
const server = app.listen(port, () => console.log(`Raíz & Madera API escuchando en http://localhost:${port}`));

async function shutdown(signal) {
  console.log(`\n${signal}: cerrando servidor...`);
  server.close(async () => {
    await pool.end();
    process.exit(0);
  });
}
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
