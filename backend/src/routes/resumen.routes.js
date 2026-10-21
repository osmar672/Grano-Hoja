import { Router } from 'express';
import { resumen } from '../controllers/resumen.controller.js';
import { asyncHandler } from '../utils/asyncHandler.js';
export const resumenRouter = Router();
resumenRouter.get('/', asyncHandler(resumen));
