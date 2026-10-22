import { Router } from 'express';
import * as controller from '../controllers/reportes.controller.js';
import { requireRoleOrServiceToken, ROLE } from '../middleware/requireRole.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { validateRequest } from '../middleware/validateRequest.js';
import { emptyQuerySchema, optionalEmptyBodySchema } from '../validation/schemas.js';
export const reportesRouter = Router();
reportesRouter.get('/productos-bajo-stock', requireRoleOrServiceToken(ROLE.ADMIN, ROLE.MANAGER, ROLE.CASHIER), validateRequest({ query: emptyQuerySchema, body: optionalEmptyBodySchema }), asyncHandler(controller.productosBajoStock));
reportesRouter.get('/ventas-semana', requireRoleOrServiceToken(ROLE.ADMIN, ROLE.MANAGER), validateRequest({ query: emptyQuerySchema, body: optionalEmptyBodySchema }), asyncHandler(controller.ventasSemana));

reportesRouter.get('/consumo-insumos-semana', requireRoleOrServiceToken(ROLE.ADMIN, ROLE.MANAGER), validateRequest({ query: emptyQuerySchema, body: optionalEmptyBodySchema }), asyncHandler(controller.consumoInsumosSemana));
