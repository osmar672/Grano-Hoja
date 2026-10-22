import { pool } from '../db.js';
import { logError } from '../utils/logger.js';

const DETAIL_KEYS = new Set(['roleFrom','roleTo','activeFrom','activeTo','category','itemCount','statusFrom','statusTo','totalCents','paymentMethod','passwordReset','authMethod']);
function safeDetails(details = {}) {
  const clean = {};
  for (const [key, value] of Object.entries(details)) {
    if (!DETAIL_KEYS.has(key)) continue;
    if (typeof value === 'string' && value.length <= 40 && !/[\r\n\u0000-\u001f]/.test(value)) clean[key] = value;
    else if (typeof value === 'boolean' || (typeof value === 'number' && Number.isFinite(value))) clean[key] = value;
  }
  return clean;
}
export async function writeAuditEvent(executor, { actorId, action, resourceType, resourceId = null, details = {} }) {
  await executor.query(`INSERT INTO admin_audit_events(actor_user_id,action,resource_type,resource_id,details) VALUES(?,?,?,?,?)`,
    [actorId ?? null, action, resourceType, resourceId === null ? null : String(resourceId).slice(0, 80), JSON.stringify(safeDetails(details))]);
}
export async function recordAuditEvent(event) {
  try { await writeAuditEvent(pool, event); }
  catch (error) { logError('audit.persistence_failed', { errorName: error?.name || 'Error', errorCode: error?.code }); }
}
