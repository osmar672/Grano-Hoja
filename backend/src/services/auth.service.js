import bcrypt from 'bcrypt';
import { randomBytes } from 'node:crypto';
import { pool } from '../db.js';

export const BCRYPT_ROUNDS = 12;
const dummyHashPromise = bcrypt.hash(randomBytes(32).toString('hex'), BCRYPT_ROUNDS);
export function normalizeEmail(email) { return email.trim().toLowerCase(); }

export async function getAccountByEmail(email) {
  const result = await pool.query(`SELECT id,email,display_name,password_hash,google_sub,role,active,failed_login_attempts,locked_until
    FROM app_users WHERE email=?`, [normalizeEmail(email)]);
  return result.rows[0] || null;
}
export async function verifyPassword(password, account) {
  const hash = account?.password_hash || await dummyHashPromise;
  return bcrypt.compare(password, hash);
}
export async function recordFailedLogin(accountId) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query('SELECT failed_login_attempts,locked_until FROM app_users WHERE id=? FOR UPDATE', [accountId]);
    if (!rows[0]) { await client.query('COMMIT'); return; }
    const lockedUntil = rows[0].locked_until ? new Date(rows[0].locked_until).getTime() : 0;
    const attempts = lockedUntil && lockedUntil <= Date.now() ? 1 : Number(rows[0].failed_login_attempts) + 1;
    const nextLock = attempts >= 5 ? new Date(Date.now() + 15 * 60 * 1000) : null;
    await client.query('UPDATE app_users SET failed_login_attempts=?,locked_until=?,updated_at=UTC_TIMESTAMP(3) WHERE id=?', [attempts, nextLock, accountId]);
    await client.query('COMMIT');
  } catch (error) { await client.query('ROLLBACK').catch(() => {}); throw error; }
  finally { client.release(); }
}

export async function recordSuccessfulLogin(accountId) {
  await pool.query('UPDATE app_users SET failed_login_attempts=0, locked_until=NULL, last_login_at=UTC_TIMESTAMP(3), updated_at=UTC_TIMESTAMP(3) WHERE id=?', [accountId]);
}
export function toPublicUser(account) {
  return { id: account.id, email: account.email, displayName: account.display_name ?? account.displayName, role: account.role };
}
export async function getAccountByGoogleSub(googleSub) {
  const result = await pool.query(`SELECT id,email,display_name,password_hash,google_sub,role,active,failed_login_attempts,locked_until
    FROM app_users WHERE google_sub=?`, [googleSub]);
  return result.rows[0] || null;
}
export async function createGoogleAccount({ email, displayName, googleSub }) {
  const result = await pool.query(`INSERT INTO app_users(email,display_name,password_hash,google_sub,role,active)
    VALUES(?,?,NULL,?,'caja',TRUE)`, [normalizeEmail(email), displayName.trim().slice(0, 120), googleSub]);
  const created = await pool.query(`SELECT id,email,display_name,password_hash,google_sub,role,active,failed_login_attempts,locked_until FROM app_users WHERE id=?`, [result.insertId]);
  return created.rows[0];
}
