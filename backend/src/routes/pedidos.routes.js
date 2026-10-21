import { Router } from 'express';
import * as controller from '../controllers/pedidos.controller.js';
import { requireAuth } from '../middleware/requireAuth.js';
import { requireRole, ROLE } from '../middleware/requireRole.js';
import { validateRequest } from '../middleware/validateRequest.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { emptyQuerySchema, idParamsSchema, orderCreateBodySchema, orderListQuerySchema, optionalEmptyBodySchema } from '../validation/schemas.js';

export const pedidosRouter = Router();
const operationalRoles = [ROLE.ADMIN, ROLE.MANAGER, ROLE.CASHIER];
pedidosRouter.use(requireAuth);
pedidosRouter.get('/', requireRole(...operationalRoles), validateRequest({ query: orderListQuerySchema, body: optionalEmptyBodySchema }), asyncHandler(controller.listar));
pedidosRouter.post('/', requireRole(...operationalRoles), validateRequest({ body: orderCreateBodySchema, query: emptyQuerySchema }), asyncHandler(controller.crear));
pedidosRouter.get('/:id', requireRole(...operationalRoles), validateRequest({ params: idParamsSchema, query: emptyQuerySchema, body: optionalEmptyBodySchema }), asyncHandler(controller.obtener));
pedidosRouter.post('/:id/confirmar', requireRole(...operationalRoles), validateRequest({ params: idParamsSchema, body: optionalEmptyBodySchema, query: emptyQuerySchema }), asyncHandler(controller.confirmar));
pedidosRouter.post('/:id/anular', requireRole(...operationalRoles), validateRequest({ params: idParamsSchema, body: optionalEmptyBodySchema, query: emptyQuerySchema }), asyncHandler(controller.anular));
