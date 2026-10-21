import * as service from '../services/insumos.service.js';
export const listar = async (req, res) => res.json(await service.listarInsumos(req.query));
export const bajoMinimo = async (_req, res) => res.json(await service.listarBajoMinimo());
export const obtener = async (req, res) => res.json(await service.obtenerInsumo(req.params.id));
export const crear = async (req, res) => res.status(201).json(await service.crearInsumo(req.body));
export const actualizar = async (req, res) => res.json(await service.actualizarInsumo(req.params.id, req.body, false));
export const parchear = async (req, res) => res.json(await service.actualizarInsumo(req.params.id, req.body, true));
export const eliminar = async (req, res) => res.json(await service.eliminarInsumo(req.params.id));
