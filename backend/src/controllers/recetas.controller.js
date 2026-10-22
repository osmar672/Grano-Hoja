import * as service from '../services/recetas.service.js';
export const obtener = async (req, res) => res.json(await service.obtenerRecetaProducto(req.params.id));
export const reemplazar = async (req, res) => res.json(await service.reemplazarRecetaProducto(req.params.id, req.body));
