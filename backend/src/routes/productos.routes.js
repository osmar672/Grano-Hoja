import { Router } from 'express';
import * as controller from '../controllers/productos.controller.js';
import { requireAuth } from '../middleware/requireAuth.js';
import { requireRole, ROLE } from '../middleware/requireRole.js';
import { validateRequest } from '../middleware/validateRequest.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import {
  idParamsSchema,
  productCreateBodySchema,
  productListQuerySchema,
  productPatchBodySchema,
  productPutBodySchema,
  emptyQuerySchema,
  optionalEmptyBodySchema,
} from '../validation/schemas.js';

export const productosRouter = Router();
const allRoles = [ROLE.ADMIN, ROLE.MANAGER, ROLE.CASHIER];
const catalogManagers = [ROLE.ADMIN, ROLE.MANAGER];

productosRouter.use(requireAuth);
productosRouter.get('/', requireRole(...allRoles), validateRequest({ query: productListQuerySchema, body: optionalEmptyBodySchema }), asyncHandler(controller.listar));
productosRouter.post('/', requireRole(...catalogManagers), validateRequest({ body: productCreateBodySchema, query: emptyQuerySchema }), asyncHandler(controller.crear));
productosRouter.get('/:id', requireRole(...allRoles), validateRequest({ params: idParamsSchema, query: emptyQuerySchema, body: optionalEmptyBodySchema }), asyncHandler(controller.obtener));
productosRouter.put('/:id', requireRole(...catalogManagers), validateRequest({ params: idParamsSchema, body: productPutBodySchema, query: emptyQuerySchema }), asyncHandler(controller.actualizar));
productosRouter.patch('/:id', requireRole(...catalogManagers), validateRequest({ params: idParamsSchema, body: productPatchBodySchema, query: emptyQuerySchema }), asyncHandler(controller.parchear));
productosRouter.delete('/:id', requireRole(ROLE.ADMIN), validateRequest({ params: idParamsSchema, query: emptyQuerySchema, body: optionalEmptyBodySchema }), asyncHandler(controller.eliminar));
