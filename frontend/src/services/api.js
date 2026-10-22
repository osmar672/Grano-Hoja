const API_URL = (import.meta.env.VITE_API_URL || '/api').replace(/\/$/, '');
let cachedCsrfToken = null;
let csrfRequest = null;

function apiError(payload, status) {
  const error = new Error(payload?.error || `La API respondió HTTP ${status}`);
  error.status = status;
  error.payload = payload;
  return error;
}

async function fetchCsrfToken(signal) {
  if (cachedCsrfToken) return cachedCsrfToken;
  if (!csrfRequest) {
    csrfRequest = (async () => {
      let response;
      try {
        response = await fetch(`${API_URL}/auth/csrf`, {
          method: 'GET',
          credentials: 'include',
          headers: { Accept: 'application/json' },
          signal,
        });
      } catch (cause) {
        if (cause?.name === 'AbortError') throw cause;
        const error = new Error('No se pudo obtener el token de seguridad CSRF. Comprueba que el backend esté encendido.');
        error.status = 0;
        error.cause = cause;
        throw error;
      }
      const payload = await response.json().catch(() => null);
      if (!response.ok || typeof payload?.csrfToken !== 'string') {
        throw apiError(payload, response.status);
      }
      cachedCsrfToken = payload.csrfToken;
      return cachedCsrfToken;
    })();
  }
  try {
    return await csrfRequest;
  } finally {
    csrfRequest = null;
  }
}

export function clearCsrfToken() {
  cachedCsrfToken = null;
  csrfRequest = null;
}

export async function apiRequest(path, options = {}) {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const method = String(options.method || 'GET').toUpperCase();
  const headers = { ...(options.body ? { 'Content-Type': 'application/json' } : {}), ...options.headers };

  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method) && normalizedPath !== '/auth/csrf') {
    headers['X-CSRF-Token'] = await fetchCsrfToken(options.signal);
  }

  let response;
  try {
    response = await fetch(`${API_URL}${normalizedPath}`, {
      ...options,
      method,
      credentials: 'include',
      headers,
    });
  } catch (cause) {
    if (cause?.name === 'AbortError') throw cause;
    const error = new Error('No se pudo conectar con la API. Comprueba que el backend esté encendido y que VITE_API_URL sea correcto.');
    error.status = 0;
    error.cause = cause;
    throw error;
  }

  const text = await response.text();
  let payload = null;
  if (text) {
    try { payload = JSON.parse(text); }
    catch { payload = { error: text }; }
  }

  if (!response.ok) {
    if (response.status === 403 && payload?.error?.includes('Token CSRF')) clearCsrfToken();
    throw apiError(payload, response.status);
  }

  // login y OAuth regeneran la sesión: el siguiente cambio debe pedir un token de esa sesión nueva.
  if (normalizedPath === '/auth/login' || normalizedPath === '/auth/logout') clearCsrfToken();
  return payload;
}

export const api = {
  get: (path, options = {}) => apiRequest(path, { ...options, method: 'GET' }),
  post: (path, body, options = {}) => apiRequest(path, { ...options, method: 'POST', body: JSON.stringify(body) }),
  put: (path, body, options = {}) => apiRequest(path, { ...options, method: 'PUT', body: JSON.stringify(body) }),
  patch: (path, body, options = {}) => apiRequest(path, { ...options, method: 'PATCH', body: JSON.stringify(body) }),
  delete: (path, options = {}) => apiRequest(path, { ...options, method: 'DELETE' }),
};
