const WEBHOOK_URL = import.meta.env.VITE_N8N_WEBHOOK_URL;

export async function generarSugerenciaCompra(solicitud = 'Analiza existencias y ventas de los últimos siete días y sugiere una compra justificada.') {
  if (!WEBHOOK_URL) {
    const error = new Error('Configura VITE_N8N_WEBHOOK_URL en frontend/.env y reinicia Vite.');
    error.status = 0;
    throw error;
  }
  let response;
  try {
    response = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ solicitud }),
    });
  } catch (cause) {
    const error = new Error('No se pudo conectar con n8n. Revisa que el workflow esté activo, la URL y CORS.');
    error.status = 0;
    error.cause = cause;
    throw error;
  }
  const body = await response.json().catch(() => ({}));
  if (!response.ok || body.ok === false) {
    const error = new Error(body.error || `n8n respondió HTTP ${response.status}`);
    error.status = response.status;
    throw error;
  }
  if (body.ok !== true || !body.data) {
    const error = new Error('La respuesta de n8n no cumple el contrato { ok, data, error }.');
    error.status = response.status;
    throw error;
  }
  return body.data;
}
