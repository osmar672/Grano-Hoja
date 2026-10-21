import { Router } from 'express';
import { resumen } from '../controllers/resumen.controller.js';
import { requireAuth } from '../middleware/requireAuth.js';
import { requireRole, ROLE } from '../middleware/requireRole.js';
import { validateRequest } from '../middleware/validateRequest.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { emptyQuerySchema, optionalEmptyBodySchema, summaryQuerySchema } from '../validation/schemas.js';

export const resumenRouter = Router();
resumenRouter.get('/', requireAuth, requireRole(ROLE.ADMIN, ROLE.MANAGER, ROLE.CASHIER), validateRequest({ query: summaryQuerySchema, body: optionalEmptyBodySchema }), asyncHandler(resumen));
