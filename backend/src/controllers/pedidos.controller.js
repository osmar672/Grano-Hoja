import * as service from '../services/pedidos.service.js';
import { logInfo } from '../utils/logger.js';
import { recordAuditEvent } from '../services/audit.service.js';

function audit(req, action, orderId, itemCount) {
  logInfo(`audit.sale.${action}`, {
    requestId: req.requestId,
    actorId: req.user?.id === undefined ? undefined : String(req.user.id),
    role: req.user?.role,
    action,
    outcome: 'success',
    resourceType: 'sale',
    resourceId: orderId === undefined ? undefined : String(orderId),
    itemCount,
  });
}

export const listar = async (req, res) => res.json(await service.listarPedidos(req.query));
export const obtener = async (req, res) => res.json(await service.obtenerPedido(req.params.id));
export const crear = async (req, res) => {
  const order = await service.crearPedido(req.body);
  audit(req, 'created', order.id, Array.isArray(req.body?.items) ? req.body.items.length : undefined);
  await recordAuditEvent({ actorId: req.user?.id, action: 'sale.created', resourceType: 'sale', resourceId: order.id, details: { itemCount: Array.isArray(req.body?.items) ? req.body.items.length : 0 } });
  return res.status(201).json(order);
};
export const confirmar = async (req, res) => {
  const order = await service.confirmarPedido(req.params.id);
  audit(req, 'confirmed', order.id);
  await recordAuditEvent({ actorId: req.user?.id, action: 'sale.confirmed', resourceType: 'sale', resourceId: order.id, details: { paymentMethod: order.metodo_pago } });
  return res.json(order);
};
export const anular = async (req, res) => {
  const order = await service.anularPedido(req.params.id);
  audit(req, 'cancelled', order.id);
  await recordAuditEvent({ actorId: req.user?.id, action: 'sale.cancelled', resourceType: 'sale', resourceId: order.id });
  return res.json(order);
};
