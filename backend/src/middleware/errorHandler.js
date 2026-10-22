import { AppError } from '../utils/AppError.js';
import { logError } from '../utils/logger.js';

export function notFound(req, res, next) {
  // No incluimos la URL completa porque una query podría contener datos sensibles.
  next(new AppError(404, `Ruta no encontrada: ${req.method} ${req.path}`));
}

export function errorHandler(error, req, res, _next) {
  if (error instanceof SyntaxError && error.status === 400 && 'body' in error) {
    return res.status(400).json({ error: 'El cuerpo JSON no es válido' });
  }

  if (error.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'Ya existe un registro con esos datos únicos' });
  if (['ER_ROW_IS_REFERENCED_2', 'ER_NO_REFERENCED_ROW_2'].includes(error.code)) return res.status(409).json({ error: 'No se puede completar la operación porque el registro está relacionado con otros datos' });
  if (['ER_CHECK_CONSTRAINT_VIOLATED', 'ER_TRUNCATED_WRONG_VALUE', 'ER_DATA_TOO_LONG', 'ER_WARN_DATA_OUT_OF_RANGE', 'ER_BAD_NULL_ERROR', 'ER_TRUNCATED_WRONG_VALUE_FOR_FIELD'].includes(error.code)) {
    return res.status(400).json({ error: 'Los datos no cumplen el formato o las restricciones permitidas' });
  }

  const status = Number.isInteger(error.status) ? error.status : 500;
  if (status >= 500) {
    // Se registra solamente metadata permitida: nunca el mensaje, stack, SQL ni conexión de BD.
    logError('http.request_failed', {
      requestId: req.requestId,
      method: req.method,
      path: `${req.baseUrl || ''}${req.route?.path || req.path || '/'}`.slice(0, 180),
      statusCode: status,
      actorId: req.user?.id === undefined ? undefined : String(req.user.id),
      role: req.user?.role,
      errorName: error.name || 'Error',
      errorCode: typeof error.code === 'string' ? error.code : undefined,
    });
  }
  return res.status(status).json({ error: status >= 500 ? 'Error interno del servidor' : error.message });
}
