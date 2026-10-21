import { Router } from 'express';
import * as controller from '../controllers/pedidos.controller.js';
import { asyncHandler } from '../utils/asyncHandler.js';
export const pedidosRouter = Router();
pedidosRouter.get('/', asyncHandler(controller.listar));
pedidosRouter.post('/', asyncHandler(controller.crear));
pedidosRouter.get('/:id', asyncHandler(controller.obtener));
pedidosRouter.post('/:id/confirmar', asyncHandler(controller.confirmar));
pedidosRouter.post('/:id/anular', asyncHandler(controller.anular));
