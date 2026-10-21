import { randomUUID } from 'node:crypto';
import { logEvent } from '../utils/logger.js';

export function requestLogger(req, res, next) {
  const startedAt = Date.now();
  req.requestId = randomUUID(); // Nunca se confía en un ID proporcionado por el cliente.
  res.setHeader('X-Request-Id', req.requestId);

  res.on('finish', () => {
    if (req.path === '/api/health' && res.statusCode < 400) return;
    const routePath = req.route?.path;
    const path = `${req.baseUrl || ''}${routePath || req.path || '/'}`.split('?')[0].slice(0, 180);
    const level = res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info';
    logEvent(level, 'http.request_completed', {
      requestId: req.requestId,
      method: req.method,
      path,
      statusCode: res.statusCode,
      durationMs: Math.max(0, Date.now() - startedAt),
      actorId: req.user?.id === undefined ? undefined : String(req.user.id),
      role: req.user?.role,
    });
  });
  next();
}
