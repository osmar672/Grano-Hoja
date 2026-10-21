import { timingSafeEqual } from 'node:crypto';

const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

function configuredOrigins() {
  return (process.env.CORS_ORIGIN || 'http://localhost:5173')
    .split(',').map((origin) => origin.trim()).filter(Boolean);
}

export function csrfTokenMatches(expected, supplied) {
  if (typeof expected !== 'string' || typeof supplied !== 'string') return false;
  const expectedBuffer = Buffer.from(expected);
  const suppliedBuffer = Buffer.from(supplied);
  return expectedBuffer.length > 0 && expectedBuffer.length === suppliedBuffer.length && timingSafeEqual(expectedBuffer, suppliedBuffer);
}

export function csrfProtection(req, res, next) {
  if (!MUTATING_METHODS.has(req.method)) return next();

  const origin = req.get('origin');
  if (origin && !configuredOrigins().includes(origin)) {
    return res.status(403).json({ error: 'Origen no autorizado para esta operación' });
  }

  // Defense in depth: navegadores modernos señalan peticiones iniciadas desde otro sitio.
  if (req.get('sec-fetch-site') === 'cross-site') {
    return res.status(403).json({ error: 'Solicitud entre sitios bloqueada por seguridad' });
  }

  const expected = req.session?.csrfToken;
  const supplied = req.get('x-csrf-token');
  if (!csrfTokenMatches(expected, supplied)) {
    return res.status(403).json({ error: 'Token CSRF ausente o inválido. Actualiza la página e inténtalo de nuevo.' });
  }

  return next();
}
