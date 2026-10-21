function getConfiguredWebhook() {
  const configuredUrl = process.env.N8N_WEBHOOK_URL;
  const token = process.env.N8N_WEBHOOK_AUTH_TOKEN;
  if (!configuredUrl || !token || Buffer.byteLength(token) < 32) return null;

  let target;
  try {
    target = new URL(configuredUrl);
  } catch {
    return null;
  }
  if (!['http:', 'https:'].includes(target.protocol) || target.username || target.password) return null;
  const localHosts = new Set(['localhost', '127.0.0.1', '::1', '[::1]']);
  if (process.env.NODE_ENV === 'production' && (target.protocol !== 'https:' || localHosts.has(target.hostname))) return null;
  return { target: target.toString(), token };
}

export async function sugerenciaCompra(req, res) {
  const config = getConfiguredWebhook();
  if (!config) {
    return res.status(503).json({ error: 'El asistente de compras no está configurado de forma segura en el servidor' });
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30_000);
  try {
    const response = await fetch(config.target, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-rm-webhook-token': config.token,
      },
      body: JSON.stringify({ solicitud: req.body.solicitud }),
      signal: controller.signal,
    });
    const payload = await response.json().catch(() => null);

    if (!response.ok) {
      // No se envían al navegador mensajes internos, credenciales ni detalles de depuración de n8n.
      return res.status(502).json({ error: 'El asistente no pudo completar la solicitud. Revisa su configuración o ejecución en n8n.' });
    }

    if (!payload || payload.ok !== true || !payload.data || typeof payload.error === 'undefined') {
      return res.status(502).json({ error: 'El asistente devolvió una respuesta inválida. Revisa la ejecución del workflow.' });
    }
    res.set('Cache-Control', 'no-store');
    return res.status(200).json({ ok: true, data: payload.data, error: null });
  } catch (error) {
    if (error?.name === 'AbortError') {
      return res.status(504).json({ error: 'El asistente tardó demasiado en responder. Inténtalo de nuevo.' });
    }
    return res.status(502).json({ error: 'No se pudo conectar con el asistente de compras. Revisa la configuración de n8n.' });
  } finally {
    clearTimeout(timeout);
  }
}
