import * as service from '../services/productos.service.js';
import { logInfo } from '../utils/logger.js';
import { recordAuditEvent } from '../services/audit.service.js';

function audit(req, action, productId) {
  logInfo(`audit.product.${action}`, {
    requestId: req.requestId,
    actorId: req.user?.id === undefined ? undefined : String(req.user.id),
    role: req.user?.role,
    action,
    outcome: 'success',
    resourceType: 'product',
    resourceId: productId === undefined ? undefined : String(productId),
  });
}

export const listar = async (req, res) => res.json(await service.listarProductos(req.query));
export const obtener = async (req, res) => res.json(await service.obtenerProducto(req.params.id));
export const crear = async (req, res) => {
  const product = await service.crearProducto(req.body);
  audit(req, 'created', product.id);
  await recordAuditEvent({ actorId: req.user?.id, action: 'product.created', resourceType: 'product', resourceId: product.id, details: { category: product.categoria } });
  return res.status(201).json(product);
};
export const actualizar = async (req, res) => {
  const product = await service.actualizarProducto(req.params.id, req.body, false);
  audit(req, 'updated', product.id);
  await recordAuditEvent({ actorId: req.user?.id, action: 'product.updated', resourceType: 'product', resourceId: product.id, details: { category: product.categoria } });
  return res.json(product);
};
export const parchear = async (req, res) => {
  const product = await service.actualizarProducto(req.params.id, req.body, true);
  audit(req, 'patched', product.id);
  await recordAuditEvent({ actorId: req.user?.id, action: 'product.patched', resourceType: 'product', resourceId: product.id, details: { category: product.categoria } });
  return res.json(product);
};
export const eliminar = async (req, res) => {
  const result = await service.eliminarProducto(req.params.id);
  audit(req, 'deleted', result.id);
  await recordAuditEvent({ actorId: req.user?.id, action: 'product.deleted', resourceType: 'product', resourceId: result.id });
  return res.json(result);
};
