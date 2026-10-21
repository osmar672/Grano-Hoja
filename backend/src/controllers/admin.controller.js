import * as service from '../services/admin.service.js';
import { logInfo } from '../utils/logger.js';

export async function overview(_req, res) {
  return res.json({ ok: true, data: await service.getOverview() });
}

export async function listUsers(req, res) {
  return res.json({ ok: true, data: await service.listUsers(req.query) });
}

export async function createUser(req, res) {
  const user = await service.createUser(req.body, req.user.id);
  logInfo('admin.user_created', {
    requestId: req.requestId, actorId: String(req.user.id), role: req.user.role,
    action: 'user_create', outcome: 'success', resourceType: 'user', resourceId: String(user.id),
  });
  return res.status(201).json({ ok: true, data: user });
}

export async function updateUser(req, res) {
  const user = await service.updateUser(req.params.id, req.body, req.user.id);
  logInfo('admin.user_updated', {
    requestId: req.requestId, actorId: String(req.user.id), role: req.user.role,
    action: 'user_update', outcome: 'success', resourceType: 'user', resourceId: String(user.id),
  });
  return res.json({ ok: true, data: user });
}

export async function audit(req, res) {
  return res.json({ ok: true, data: await service.listAuditEvents(req.query) });
}
