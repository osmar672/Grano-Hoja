import bcrypt from 'bcrypt';
import { randomBytes } from 'node:crypto';
import { pool } from '../db.js';

export const BCRYPT_ROUNDS = 12;
// Una comparación ficticia reduce la diferencia de tiempo cuando el correo no existe.
const dummyHashPromise = bcrypt.hash(randomBytes(32).toString('hex'), BCRYPT_ROUNDS);

export function normalizeEmail(email) {
  return email.trim().toLowerCase();
}

export async function getAccountByEmail(email) {
  const result = await pool.query(
    `SELECT id, email, display_name, password_hash, role, active,
            failed_login_attempts, locked_until
     FROM app_users WHERE email = $1`,
    [normalizeEmail(email)],
  );
  return result.rows[0] || null;
}

export async function verifyPassword(password, account) {
  const hash = account?.password_hash || await dummyHashPromise;
  return bcrypt.compare(password, hash);
}

export async function recordFailedLogin(accountId) {
  await pool.query(
    `UPDATE app_users
     SET failed_login_attempts = CASE
       WHEN locked_until IS NOT NULL AND locked_until <= NOW() THEN 1
       ELSE failed_login_attempts + 1
     END,
     locked_until = CASE
       WHEN (CASE WHEN locked_until IS NOT NULL AND locked_until <= NOW() THEN 1
                  ELSE failed_login_attempts + 1 END) >= 5
       THEN NOW() + INTERVAL '15 minutes'
       ELSE NULL
     END,
     updated_at = NOW()
     WHERE id = $1`,
    [accountId],
  );
}

export async function recordSuccessfulLogin(accountId) {
  await pool.query(
    `UPDATE app_users
     SET failed_login_attempts = 0, locked_until = NULL,
         last_login_at = NOW(), updated_at = NOW()
     WHERE id = $1`,
    [accountId],
  );
}

export function toPublicUser(account) {
  return {
    id: account.id,
    email: account.email,
    displayName: account.display_name ?? account.displayName,
    role: account.role,
  };
}
