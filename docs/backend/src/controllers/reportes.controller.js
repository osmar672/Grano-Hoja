import { obtenerVentasSemana } from '../services/reportes.service.js';
export const ventasSemana = async (_req, res) => res.json(await obtenerVentasSemana());
