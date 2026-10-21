import * as service from '../services/productos.service.js';
export const listar = async (req, res) => res.json(await service.listarProductos(req.query));
export const obtener = async (req, res) => res.json(await service.obtenerProducto(req.params.id));
export const crear = async (req, res) => res.status(201).json(await service.crearProducto(req.body));
export const actualizar = async (req, res) => res.json(await service.actualizarProducto(req.params.id, req.body, false));
export const parchear = async (req, res) => res.json(await service.actualizarProducto(req.params.id, req.body, true));
export const eliminar = async (req, res) => res.json(await service.eliminarProducto(req.params.id));
