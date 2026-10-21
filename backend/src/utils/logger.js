const ALLOWED_FIELDS = new Set([
  'requestId', 'method', 'path', 'statusCode', 'durationMs', 'actorId', 'role',
  'resourceType', 'resourceId', 'action', 'outcome', 'reason', 'errorName',
  'errorCode', 'signal', 'port', 'authMethod', 'itemCount', 'resultCount',
]);

const SAFE_TEXT = /^[\p{L}\p{N} _./:@-]{1,200}$/u;

function safeValue(key, value) {
  if (value === undefined || value === null) return undefined;
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : undefined;
  }
  if (typeof value !== 'string') return undefined;

  // Nunca se admiten mensajes libres, correos, cuerpos, cabeceras, tokens ni secretos.
  if (/[\r\n\t\u0000-\u001f\u007f]/.test(value)) return undefined;
  const text = value.slice(0, 200);
  if (!SAFE_TEXT.test(text)) return undefined;
  if (/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i.test(text) || /bearer\s|password|secret|postgres(?:ql)?:\/\//i.test(text)) return undefined;
  if (['requestId', 'actorId', 'resourceId', 'errorCode'].includes(key) && !/^[A-Za-z0-9_-]{1,100}$/.test(text)) return undefined;
  if (key === 'method' && !/^[A-Z]{3,10}$/.test(text)) return undefined;
  if (key === 'role' && !['admin', 'encargado', 'caja'].includes(text)) return undefined;
  return text;
}

// Esta función con lista permitida evita que un error o payload completo termine en los logs.
export function createLogEntry(level, event, fields = {}) {
  const entry = {
    timestamp: new Date().toISOString(),
    level: ['info', 'warn', 'error'].includes(level) ? level : 'info',
    event: String(event).replace(/[^a-zA-Z0-9_.-]/g, '').slice(0, 80) || 'application.event',
  };

  for (const [key, value] of Object.entries(fields || {})) {
    if (!ALLOWED_FIELDS.has(key)) continue;
    const normalized = safeValue(key, value);
    if (normalized !== undefined) entry[key] = normalized;
  }
  return entry;
}

export function logEvent(level, event, fields = {}) {
  const line = `${JSON.stringify(createLogEntry(level, event, fields))}\n`;
  if (level === 'error' || level === 'warn') process.stderr.write(line);
  else process.stdout.write(line);
}

export const logInfo = (event, fields) => logEvent('info', event, fields);
export const logWarn = (event, fields) => logEvent('warn', event, fields);
export const logError = (event, fields) => logEvent('error', event, fields);
