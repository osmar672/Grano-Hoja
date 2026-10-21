import { Router } from 'express';
import { sugerenciaCompra } from '../controllers/agente.controller.js';
import { requireAuth } from '../middleware/requireAuth.js';
import { requireRole, ROLE } from '../middleware/requireRole.js';
import { validateRequest } from '../middleware/validateRequest.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { agentBodySchema, emptyQuerySchema } from '../validation/schemas.js';

export const agenteRouter = Router();
agenteRouter.post(
  '/sugerencia-compra',
  requireAuth,
  requireRole(ROLE.ADMIN, ROLE.MANAGER),
  validateRequest({ body: agentBodySchema, query: emptyQuerySchema }),
  asyncHandler(sugerenciaCompra),
);
