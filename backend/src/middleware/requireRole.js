import { timingSafeEqual } from 'node:crypto';
import { requireAuth } from './requireAuth.js';

export const ROLE = Object.freeze({ ADMIN: 'admin', MANAGER: 'encargado', CASHIER: 'caja' });

function hasServiceToken(req) {
  const configured = process.env.N8N_API_SERVICE_TOKEN || '';
  const received = req.get('x-service-token') || '';
  if (Buffer.byteLength(configured) < 32 || !received) return false;
  const expectedBuffer = Buffer.from(configured);
  const receivedBuffer = Buffer.from(received);
  if (expectedBuffer.length !== receivedBuffer.length) return false;
  return timingSafeEqual(expectedBuffer, receivedBuffer);
}

export function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Debes iniciar sesión para continuar' });
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: 'No tienes permisos para realizar esta operación' });
    }
    return next();
  };
}

// Solo endpoints de lectura usados por n8n aceptan el token de servicio.
// La clave se compara en tiempo constante y debe tener al menos 32 bytes.
export function requireRoleOrServiceToken(...allowedRoles) {
  return (req, res, next) => {
    if (hasServiceToken(req)) {
      req.serviceAuth = true;
      return next();
    }
    return requireAuth(req, res, (error) => {
      if (error) return next(error);
      if (!req.user) return undefined; // requireAuth ya respondió 401.
      if (!allowedRoles.includes(req.user.role)) {
        return res.status(403).json({ error: 'No tienes permisos para consultar este recurso' });
      }
      return next();
    });
  };
}
