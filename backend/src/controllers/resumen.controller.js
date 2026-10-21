import { obtenerResumen } from '../services/resumen.service.js';
export const resumen = async (req, res) => res.json(await obtenerResumen(req.query.fecha));
