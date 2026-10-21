import * as service from '../services/pedidos.service.js';
export const listar = async (req, res) => res.json(await service.listarPedidos(req.query));
export const obtener = async (req, res) => res.json(await service.obtenerPedido(req.params.id));
export const crear = async (req, res) => res.status(201).json(await service.crearPedido(req.body));
export const confirmar = async (req, res) => res.json(await service.confirmarPedido(req.params.id));
export const anular = async (req, res) => res.json(await service.anularPedido(req.params.id));
