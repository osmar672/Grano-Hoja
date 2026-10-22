import * as service from '../services/reportes.service.js';
export const productosBajoStock = async (_req, res) => res.json(await service.obtenerProductosBajoStock());
export const ventasSemana = async (_req, res) => res.json(await service.obtenerVentasSemana());

export const consumoInsumosSemana = async (_req, res) => res.json(await service.obtenerConsumoInsumosSemana());
