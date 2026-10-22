const LOCAL_ORIGINS = ['http://localhost:5173', 'http://127.0.0.1:5173'];

export function getVercelOrigin() {
  const isProduction = process.env.VERCEL_ENV === 'production';
  const host = isProduction
    ? (process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_URL)
    : (process.env.VERCEL_URL || process.env.VERCEL_PROJECT_PRODUCTION_URL);
  if (!host || typeof host !== 'string') return null;
  try {
    const url = new URL(host.includes('://') ? host : `https://${host}`);
    if (url.protocol !== 'https:' || url.username || url.password || url.pathname !== '/' || url.search || url.hash) return null;
    return url.origin;
  } catch {
    return null;
  }
}

export function getPublicHttpsOrigin() {
  const configured = process.env.PUBLIC_HTTPS_ORIGIN;
  if (configured) return configured;
  return getVercelOrigin();
}

export function getConfiguredOrigins() {
  const configured = (process.env.CORS_ORIGIN || '')
    .split(',').map((origin) => origin.trim()).filter(Boolean);
  const deploymentOrigin = getVercelOrigin();
  const publicOrigin = getPublicHttpsOrigin();
  const isProduction = process.env.NODE_ENV === 'production';
  const fallback = isProduction ? [] : LOCAL_ORIGINS;
  return [...new Set([...configured, ...fallback, deploymentOrigin, publicOrigin].filter(Boolean))];
}
