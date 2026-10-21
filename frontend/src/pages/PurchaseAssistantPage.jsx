import { useState } from 'react';
import { generarSugerenciaCompra } from '../services/agent.js';
import ErrorMessage from '../components/ErrorMessage.jsx';

export default function PurchaseAssistantPage() {
  const [request, setRequest] = useState('Analiza los insumos por debajo del mínimo y las ventas de los últimos siete días. Sugiere cantidades justificadas para comprar.');
  const [result, setResult] = useState(null); const [error, setError] = useState(null); const [loading, setLoading] = useState(false);
  const run = async () => {
    setLoading(true); setError(null); setResult(null);
    try { setResult(await generarSugerenciaCompra(request)); }
    catch (requestError) { setError(requestError); }
    finally { setLoading(false); }
  };
  const suggestions = Array.isArray(result?.sugerencias) ? result.sugerencias : Array.isArray(result?.data?.sugerencias) ? result.data.sugerencias : null;
  return <section className="page-stack narrow-page"><div className="page-hero assistant-hero"><div><span className="eyebrow">ASISTENTE DE COMPRAS · N8N</span><h1>Compra con criterio.</h1><p>La IA combina existencias y consumo semanal para proponer reposiciones justificadas. Es una sugerencia: tú decides qué comprar.</p></div><div className="assistant-symbol" aria-hidden="true">✳</div></div>
    <section className="panel-card assistant-input"><label className="field">¿Qué quieres analizar?<textarea rows="3" value={request} onChange={(e) => setRequest(e.target.value)} /></label><div className="assistant-run-row"><span className="form-hint">Consulta datos de la API; no modifica stock ni crea órdenes de compra.</span><button className="button button-primary" type="button" disabled={loading || !request.trim()} onClick={run}>{loading ? 'Analizando datos…' : 'Generar sugerencia ↗'}</button></div></section>
    <ErrorMessage error={error} />
    {loading && <div className="state-panel"><span className="spinner"/><p>Revisando mínimos, ventas y consumo estimado…</p></div>}
    {result && <section className="panel-card suggestion-result"><div className="section-heading"><div><span className="eyebrow">RESULTADO DEL AGENTE</span><h2>Plan sugerido</h2></div><span className="status-pill status-good">Generado</span></div>
      {result.resumen && <p className="suggestion-summary">{result.resumen}</p>}
      {suggestions ? suggestions.length ? <div className="suggestion-list">{suggestions.map((item, index) => <article className="suggestion-item" key={`${item.insumo || 'insumo'}-${index}`}><div className="suggestion-amount"><strong>{item.cantidad_sugerida ?? item.cantidad ?? '—'}</strong><small>{item.unidad || ''}</small></div><div><h3>{item.insumo || 'Insumo'}</h3><p>{item.justificacion || item.motivo || 'Sin justificación detallada devuelta por el agente.'}</p></div></article>)}</div> : <p className="muted-text">El agente no recomendó compras con los datos actuales.</p> : <pre className="json-output">{JSON.stringify(result, null, 2)}</pre>}
      {result.advertencia && <p className="form-hint">{result.advertencia}</p>}
    </section>}
    <div className="assistant-note"><span aria-hidden="true">i</span><p>La sugerencia se basa en los datos recibidos de la API. Revisa cantidades, proveedores y espacio de almacenamiento antes de comprar.</p></div>
  </section>;
}
