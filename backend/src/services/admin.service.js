import bcrypt from 'bcrypt';
import { pool } from '../db.js';
import { AppError } from '../utils/AppError.js';
import { writeAuditEvent } from './audit.service.js';
import { assertAdminUpdateAllowed } from './adminRules.js';

const BCRYPT_ROUNDS = 12;

export async function getOverview() {
  const result = await pool.query(`
    SELECT
      (SELECT COUNT(*)::int FROM app_users WHERE active = TRUE) AS active_users,
      (SELECT COUNT(*)::int FROM app_users WHERE active = FALSE) AS inactive_users,
      (SELECT COUNT(*)::int FROM app_users WHERE role = 'admin' AND active = TRUE) AS active_admins,
      (SELECT COUNT(*)::int FROM productos WHERE activo = TRUE) AS active_products,
      (SELECT COUNT(*)::int FROM productos WHERE activo = TRUE AND stock <= stock_minimo) AS low_stock_products,
      (SELECT COUNT(*)::int FROM pedidos WHERE estado = 'confirmado'
        AND fecha_confirmacion >= ((NOW() AT TIME ZONE 'America/Costa_Rica')::date::timestamp AT TIME ZONE 'America/Costa_Rica')) AS sales_today_count,
      (SELECT COALESCE(SUM(total), 0)::numeric(14,2) FROM pedidos WHERE estado = 'confirmado'
        AND fecha_confirmacion >= ((NOW() AT TIME ZONE 'America/Costa_Rica')::date::timestamp AT TIME ZONE 'America/Costa_Rica')) AS sales_today_total
  `);
  return result.rows[0];
}

export async function listUsers({ q = '', role = '', status = '', limit = 100 } = {}) {
  const result = await pool.query(`
    SELECT id, email, display_name, role, active, google_sub IS NOT NULL AS google_linked,
           password_hash IS NOT NULL AS has_local_password, last_login_at, created_at,
           (locked_until IS NOT NULL AND locked_until > NOW()) AS temporarily_locked
    FROM app_users
    WHERE ($1 = '' OR email ILIKE '%' || $1 || '%' OR display_name ILIKE '%' || $1 || '%')
      AND ($2 = '' OR role = $2)
      AND ($3 = '' OR ($3 = 'active' AND active = TRUE) OR ($3 = 'inactive' AND active = FALSE))
    ORDER BY active DESC, created_at DESC, id DESC
    LIMIT $4
  `, [q, role, status, limit]);
  return result.rows;
}

export async function listAuditEvents({ limit = 50 } = {}) {
  const result = await pool.query(`
    SELECT e.id, e.action, e.resource_type, e.resource_id, e.details, e.created_at,
           actor.display_name AS actor_name, actor.role AS actor_role,
           target.display_name AS target_name
    FROM admin_audit_events e
    LEFT JOIN app_users actor ON actor.id = e.actor_user_id
    LEFT JOIN app_users target ON e.resource_type = 'user' AND target.id::text = e.resource_id
    ORDER BY e.created_at DESC, e.id DESC
    LIMIT $1
  `, [limit]);
  return result.rows;
}

export async function createUser(input, actorId) {
  const passwordHash = await bcrypt.hash(input.password, BCRYPT_ROUNDS);
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const created = await client.query(`
      INSERT INTO app_users (email, display_name, password_hash, role, active)
      VALUES (LOWER(TRIM($1)), TRIM($2), $3, $4, TRUE)
      RETURNING id, email, display_name, role, active, google_sub IS NOT NULL AS google_linked,
                password_hash IS NOT NULL AS has_local_password, last_login_at, created_at,
                FALSE AS temporarily_locked
    `, [input.email, input.displayName, passwordHash, input.role]);
    const user = created.rows[0];
    await writeAuditEvent(client, {
      actorId, action: 'user.created', resourceType: 'user', resourceId: user.id,
      details: { roleTo: user.role, activeTo: true, passwordReset: false },
    });
    await client.query('COMMIT');
    return user;
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    if (error.code === '23505') throw new AppError(409, 'Ya existe una cuenta con ese correo');
    throw error;
  } finally {
    client.release();
  }
}

export async function updateUser(id, input, actorId) {
  const passwordHash = input.password ? await bcrypt.hash(input.password, BCRYPT_ROUNDS) : null;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    // Lock active administrators in stable order to avoid concurrent removal of the last administrator.
    const locked = await client.query(`
      SELECT id, role, active FROM app_users
      WHERE id = $1 OR (role = 'admin' AND active = TRUE)
      ORDER BY id FOR UPDATE
    `, [id]);
    const target = locked.rows.find((row) => Number(row.id) === Number(id));
    if (!target) throw new AppError(404, 'No existe el usuario solicitado');

    const nextRole = input.role ?? target.role;
    const nextActive = input.active ?? target.active;
    const activeAdminRows = locked.rows.filter((row) => row.role === 'admin' && row.active);
    assertAdminUpdateAllowed({ id, actorId, target, nextRole, nextActive, activeAdminCount: activeAdminRows.length });

    const updatedResult = await client.query(`
      UPDATE app_users SET role = $2, active = $3,
        password_hash = COALESCE($4, password_hash),
        failed_login_attempts = CASE WHEN $4::text IS NOT NULL THEN 0 ELSE failed_login_attempts END,
        locked_until = CASE WHEN $4::text IS NOT NULL THEN NULL ELSE locked_until END,
        updated_at = NOW()
      WHERE id = $1
      RETURNING id, email, display_name, role, active, google_sub IS NOT NULL AS google_linked,
                password_hash IS NOT NULL AS has_local_password, last_login_at, created_at,
                (locked_until IS NOT NULL AND locked_until > NOW()) AS temporarily_locked
    `, [id, nextRole, nextActive, passwordHash]);
    const user = updatedResult.rows[0];
    await writeAuditEvent(client, {
      actorId, action: 'user.updated', resourceType: 'user', resourceId: user.id,
      details: {
        roleFrom: target.role, roleTo: user.role,
        activeFrom: target.active, activeTo: user.active,
        passwordReset: Boolean(passwordHash),
      },
    });
    await client.query('COMMIT');
    return user;
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    throw error;
  } finally {
    client.release();
  }
}
