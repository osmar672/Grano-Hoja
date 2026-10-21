import { Router } from 'express';
import { ventasSemana } from '../controllers/reportes.controller.js';
import { asyncHandler } from '../utils/asyncHandler.js';
export const reportesRouter = Router();
reportesRouter.get('/ventas-semana', asyncHandler(ventasSemana));
