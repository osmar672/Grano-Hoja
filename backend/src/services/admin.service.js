import bcrypt from 'bcrypt';
import { pool } from '../db.js';
import { AppError } from '../utils/AppError.js';
import { costaRicaDayBounds } from '../utils/costaRicaDate.js';
import { writeAuditEvent } from './audit.service.js';
import { assertAdminUpdateAllowed } from './adminRules.js';

const BCRYPT_ROUNDS = 12;
const USER_SELECT = `SELECT id,email,display_name,role,active,google_sub IS NOT NULL AS google_linked,
  password_hash IS NOT NULL AS has_local_password,last_login_at,created_at,
  (locked_until IS NOT NULL AND locked_until>UTC_TIMESTAMP(3)) AS temporarily_locked FROM app_users`;

export async function getOverview() {
  const { start, end } = costaRicaDayBounds();
  const result = await pool.query(`SELECT
      (SELECT COUNT(*) FROM app_users WHERE active=TRUE) AS active_users,
      (SELECT COUNT(*) FROM app_users WHERE active=FALSE) AS inactive_users,
      (SELECT COUNT(*) FROM app_users WHERE role='admin' AND active=TRUE) AS active_admins,
      (SELECT COUNT(*) FROM productos WHERE activo=TRUE) AS active_products,
      (SELECT COUNT(*) FROM productos WHERE activo=TRUE AND stock<=stock_minimo) AS low_stock_products,
      (SELECT COUNT(*) FROM insumos WHERE activo=TRUE AND stock_actual<=stock_minimo) AS low_stock_ingredients,
      (SELECT COUNT(*) FROM pedidos WHERE estado='confirmado' AND fecha_confirmacion>=? AND fecha_confirmacion<?) AS sales_today_count,
      (SELECT COALESCE(SUM(total),0) FROM pedidos WHERE estado='confirmado' AND fecha_confirmacion>=? AND fecha_confirmacion<?) AS sales_today_total`,
    [start, end, start, end]);
  return result.rows[0];
}

export async function listUsers({ q = '', role = '', status = '', limit = 100 } = {}) {
  const result = await pool.query(`${USER_SELECT}
    WHERE (?='' OR email LIKE CONCAT('%',?,'%') OR display_name LIKE CONCAT('%',?,'%'))
      AND (?='' OR role=?)
      AND (?='' OR (?='active' AND active=TRUE) OR (?='inactive' AND active=FALSE))
    ORDER BY active DESC,created_at DESC,id DESC LIMIT ?`,
    [q,q,q,role,role,status,status,status,limit]);
  return result.rows;
}

export async function listAuditEvents({ limit = 50 } = {}) {
  const result = await pool.query(`SELECT e.id,e.action,e.resource_type,e.resource_id,e.details,e.created_at,
      actor.display_name AS actor_name,actor.role AS actor_role,target.display_name AS target_name
    FROM admin_audit_events e LEFT JOIN app_users actor ON actor.id=e.actor_user_id
    LEFT JOIN app_users target ON e.resource_type='user' AND CAST(target.id AS CHAR)=e.resource_id
    ORDER BY e.created_at DESC,e.id DESC LIMIT ?`, [limit]);
  return result.rows.map((row) => ({ ...row, details: typeof row.details === 'string' ? JSON.parse(row.details || '{}') : row.details }));
}

export async function createUser(input, actorId) {
  const passwordHash = await bcrypt.hash(input.password, BCRYPT_ROUNDS);
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const created = await client.query(`INSERT INTO app_users(email,display_name,password_hash,role,active)
      VALUES(LOWER(TRIM(?)),TRIM(?),?,?,TRUE)`, [input.email,input.displayName,passwordHash,input.role]);
    const selected = await client.query(`${USER_SELECT} WHERE id=?`, [created.insertId]);
    const user = selected.rows[0];
    await writeAuditEvent(client, { actorId, action: 'user.created', resourceType: 'user', resourceId: user.id, details: { roleTo: user.role, activeTo: true, passwordReset: false } });
    await client.query('COMMIT');
    return user;
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    if (error.code === 'ER_DUP_ENTRY') throw new AppError(409, 'Ya existe una cuenta con ese correo');
    throw error;
  } finally { client.release(); }
}

export async function updateUser(id, input, actorId) {
  const passwordHash = input.password ? await bcrypt.hash(input.password, BCRYPT_ROUNDS) : null;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const locked = await client.query(`SELECT id,role,active FROM app_users
      WHERE id=? OR (role='admin' AND active=TRUE) ORDER BY id FOR UPDATE`, [id]);
    const target = locked.rows.find((row) => Number(row.id) === Number(id));
    if (!target) throw new AppError(404, 'No existe el usuario solicitado');
    const nextRole = input.role ?? target.role;
    const nextActive = input.active ?? target.active;
    const activeAdminRows = locked.rows.filter((row) => row.role === 'admin' && row.active);
    assertAdminUpdateAllowed({ id, actorId, target, nextRole, nextActive, activeAdminCount: activeAdminRows.length });
    await client.query(`UPDATE app_users SET role=?,active=?,
      password_hash=COALESCE(?,password_hash),
      failed_login_attempts=IF(? IS NOT NULL,0,failed_login_attempts),
      locked_until=IF(? IS NOT NULL,NULL,locked_until),updated_at=UTC_TIMESTAMP(3) WHERE id=?`,
      [nextRole,nextActive,passwordHash,passwordHash,passwordHash,id]);
    const updatedResult = await client.query(`${USER_SELECT} WHERE id=?`, [id]);
    const user = updatedResult.rows[0];
    await writeAuditEvent(client, { actorId, action: 'user.updated', resourceType: 'user', resourceId: user.id,
      details: { roleFrom: target.role, roleTo: user.role, activeFrom: target.active, activeTo: user.active, passwordReset: Boolean(passwordHash) } });
    await client.query('COMMIT');
    return user;
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    throw error;
  } finally { client.release(); }
}
