import { AppError } from '../utils/AppError.js';

export function notFound(req, res, next) {
  next(new AppError(404, `Ruta no encontrada: ${req.method} ${req.originalUrl}`));
}

export function errorHandler(error, req, res, _next) {
  if (error instanceof SyntaxError && error.status === 400 && 'body' in error) {
    return res.status(400).json({ error: 'El cuerpo JSON no es válido' });
  }

  if (error.code === '23505') return res.status(409).json({ error: 'Ya existe un registro con esos datos únicos' });
  if (error.code === '23503') return res.status(409).json({ error: 'No se puede completar la operación porque el registro está relacionado con otros datos' });
  if (error.code === '23514' || error.code === '22P02' || error.code === '22003' || error.code === '22008' || error.code === '22007') {
    return res.status(400).json({ error: 'Los datos no cumplen el formato o las restricciones permitidas' });
  }

  const status = error.status || 500;
  if (status >= 500) console.error(error);
  return res.status(status).json({ error: status >= 500 ? 'Error interno del servidor' : error.message });
}
