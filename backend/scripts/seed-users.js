import 'dotenv/config';
import bcrypt from 'bcrypt';
import { pool } from '../src/db.js';

const BCRYPT_ROUNDS = 12;
const accounts = [
  { prefix: 'SEED_ADMIN', role: 'admin' },
  { prefix: 'SEED_MANAGER', role: 'encargado' },
  { prefix: 'SEED_CASHIER', role: 'caja' },
];

function validatePassword(password, label) {
  if (!password) throw new Error(`${label}: define una contraseña única en backend/.env`);
  const bytes = Buffer.byteLength(password, 'utf8');
  if (bytes < 12 || bytes > 72 || !/[a-z]/.test(password) || !/[A-Z]/.test(password) || !/[0-9]/.test(password)) {
    throw new Error(`${label}: usa 12-72 bytes e incluye minúscula, mayúscula y número`);
  }
}

function normalizeEmail(email) {
  return email.trim().toLowerCase();
}

async function seed() {
  const missing = [];
  const configured = accounts.map(({ prefix, role }) => {
    const email = process.env[`${prefix}_EMAIL`];
    const displayName = process.env[`${prefix}_NAME`];
    const password = process.env[`${prefix}_PASSWORD`];
    if (!email || !displayName || !password) missing.push(`${prefix}_EMAIL, ${prefix}_NAME y ${prefix}_PASSWORD`);
    if (password) validatePassword(password, prefix);
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error(`${prefix}_EMAIL no parece válido`);
    return { email: email ? normalizeEmail(email) : '', displayName: displayName || '', password: password || '', role };
  });

  if (missing.length) {
    throw new Error(`Configura los tres usuarios en backend/.env antes de continuar. Faltan: ${[...new Set(missing)].join('; ')}`);
  }
  if (configured.some((account) => !account.displayName.trim())) {
    throw new Error('Cada usuario debe tener un nombre visible');
  }
  if (new Set(configured.map((account) => account.email)).size !== configured.length) {
    throw new Error('Cada usuario debe tener un correo diferente');
  }
  if (new Set(configured.map((account) => account.password)).size !== configured.length) {
    throw new Error('Cada usuario debe tener una contraseña diferente');
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    for (const account of configured) {
      const passwordHash = await bcrypt.hash(account.password, BCRYPT_ROUNDS);
      await client.query(
        `INSERT INTO app_users (email, display_name, password_hash, role, active)
         VALUES ($1, $2, $3, $4, TRUE)
         ON CONFLICT (email) DO UPDATE SET
           display_name = EXCLUDED.display_name,
           password_hash = EXCLUDED.password_hash,
           role = EXCLUDED.role,
           active = TRUE,
           failed_login_attempts = 0,
           locked_until = NULL,
           updated_at = NOW()`,
        [account.email, account.displayName.trim(), passwordHash, account.role],
      );
    }
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
  for (const account of configured) console.log(`Usuario configurado: ${account.email} (${account.role})`);
  console.log('Listo. No se mostraron ni almacenaron contraseñas en texto plano.')
}

try {
  await seed();
} catch (error) {
  console.error(`No se pudieron configurar los usuarios: ${error.message}`);
  process.exitCode = 1;
} finally {
  await pool.end();
}
