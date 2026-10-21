import { Router } from 'express';
import * as controller from '../controllers/admin.controller.js';
import { requireAuth } from '../middleware/requireAuth.js';
import { requireRole, ROLE } from '../middleware/requireRole.js';
import { validateRequest } from '../middleware/validateRequest.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { adminAuditQuerySchema, adminUserCreateBodySchema, adminUserPatchBodySchema, adminUsersQuerySchema, idParamsSchema, emptyQuerySchema, optionalEmptyBodySchema } from '../validation/schemas.js';

export const adminRouter = Router();
adminRouter.use(requireAuth, requireRole(ROLE.ADMIN));
adminRouter.get('/overview', validateRequest({ query: emptyQuerySchema, body: optionalEmptyBodySchema }), asyncHandler(controller.overview));
adminRouter.get('/users', validateRequest({ query: adminUsersQuerySchema, body: optionalEmptyBodySchema }), asyncHandler(controller.listUsers));
adminRouter.post('/users', validateRequest({ body: adminUserCreateBodySchema, query: emptyQuerySchema }), asyncHandler(controller.createUser));
adminRouter.patch('/users/:id', validateRequest({ params: idParamsSchema, body: adminUserPatchBodySchema, query: emptyQuerySchema }), asyncHandler(controller.updateUser));
adminRouter.get('/audit', validateRequest({ query: adminAuditQuerySchema, body: optionalEmptyBodySchema }), asyncHandler(controller.audit));
