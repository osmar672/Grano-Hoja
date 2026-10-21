import { Router } from 'express';
import * as controller from '../controllers/insumos.controller.js';
import { requireAuth } from '../middleware/requireAuth.js';
import { requireRole, requireRoleOrServiceToken, ROLE } from '../middleware/requireRole.js';
import { validateRequest } from '../middleware/validateRequest.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import {
  idParamsSchema,
  insumoCreateBodySchema,
  insumoListQuerySchema,
  insumoPatchBodySchema,
  insumoPutBodySchema,
  emptyQuerySchema,
  optionalEmptyBodySchema,
} from '../validation/schemas.js';

export const insumosRouter = Router();
const allRoles = [ROLE.ADMIN, ROLE.MANAGER, ROLE.CASHIER];
const catalogManagers = [ROLE.ADMIN, ROLE.MANAGER];

// Endpoint de lectura requerido por el agente. Acepta usuarios autorizados o el token de servicio de n8n.
insumosRouter.get('/bajo-minimo', requireRoleOrServiceToken(...allRoles), validateRequest({ query: emptyQuerySchema, body: optionalEmptyBodySchema }), asyncHandler(controller.bajoMinimo));
insumosRouter.use(requireAuth);
insumosRouter.get('/', requireRole(...allRoles), validateRequest({ query: insumoListQuerySchema, body: optionalEmptyBodySchema }), asyncHandler(controller.listar));
insumosRouter.post('/', requireRole(...catalogManagers), validateRequest({ body: insumoCreateBodySchema, query: emptyQuerySchema }), asyncHandler(controller.crear));
insumosRouter.get('/:id', requireRole(...allRoles), validateRequest({ params: idParamsSchema, query: emptyQuerySchema, body: optionalEmptyBodySchema }), asyncHandler(controller.obtener));
insumosRouter.put('/:id', requireRole(...catalogManagers), validateRequest({ params: idParamsSchema, body: insumoPutBodySchema, query: emptyQuerySchema }), asyncHandler(controller.actualizar));
insumosRouter.patch('/:id', requireRole(...catalogManagers), validateRequest({ params: idParamsSchema, body: insumoPatchBodySchema, query: emptyQuerySchema }), asyncHandler(controller.parchear));
insumosRouter.delete('/:id', requireRole(ROLE.ADMIN), validateRequest({ params: idParamsSchema, query: emptyQuerySchema, body: optionalEmptyBodySchema }), asyncHandler(controller.eliminar));
