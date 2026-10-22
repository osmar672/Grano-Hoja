import { useState } from 'react';
import { generarSugerenciaCompra } from '../services/agent.js';
import ErrorMessage from '../components/ErrorMessage.jsx';
export default function PurchaseAssistantPage(){
  const [request,setRequest]=useState('Analiza los insumos por debajo del mínimo, el consumo real por receta y las ventas de los últimos siete días. Sugiere cantidades de reposición justificadas.');const [result,setResult]=useState(null);const [error,setError]=useState(null);const [loading,setLoading]=useState(false);
  const run=async()=>{setLoading(true);setError(null);setResult(null);try{setResult(await generarSugerenciaCompra(request));}catch(e){setError(e);}finally{setLoading(false);}};
  const suggestions=Array.isArray(result?.sugerencias)?result.sugerencias:null;
  return <section className="page-stack narrow-page"><div className="page-hero assistant-hero"><div><span className="eyebrow">ASISTENTE DE REPOSICIÓN · N8N</span><h1>Cuida lo que hace hogar.</h1><p>La IA consulta insumos bajo mínimo, ventas y consumo real registrado por recetas para sugerir qué ingredientes reponer. Tú decides qué comprar.</p></div><div className="assistant-symbol" aria-hidden="true">✿</div></div>
    <section className="panel-card assistant-input"><label className="field">¿Qué quieres analizar?<textarea rows="3" maxLength="1000" value={request} onChange={(e)=>setRequest(e.target.value)}/></label><div className="assistant-run-row"><span className="form-hint">Solo consulta datos; no cambia el stock ni genera compras.</span><button className="button button-primary" type="button" disabled={loading||!request.trim()} onClick={run}>{loading?'Analizando existencias…':'Generar sugerencia ↗'}</button></div></section>
    <ErrorMessage error={error}/>{loading&&<div className="state-panel"><span className="spinner"/><p>Revisando insumos, mínimos y consumo de la semana…</p></div>}
    {result&&<section className="panel-card suggestion-result"><div className="section-heading"><div><span className="eyebrow">RESULTADO DEL AGENTE</span><h2>Plan de reposición</h2></div><span className="status-pill status-good">Generado</span></div>{result.resumen&&<p className="suggestion-summary">{result.resumen}</p>}
      {suggestions?.length?<div className="suggestion-list">{suggestions.map((item,index)=><article className="suggestion-item" key={`${item.insumo||item.producto||'insumo'}-${index}`}><div className="suggestion-amount"><strong>{item.cantidad_sugerida??'—'}</strong><small>{item.unidad || 'unidades'}</small></div><div><h3>{item.insumo||item.producto||'Insumo'}</h3><p>{item.justificacion||'Sin justificación detallada.'}</p></div></article>)}</div>:<p className="muted-text">No hay sugerencias de compra para los datos actuales.</p>}
      {result.advertencia&&<p className="form-hint">{result.advertencia}</p>}</section>}
    <div className="assistant-note"><span aria-hidden="true">i</span><p>La sugerencia usa cifras de la API. Antes de reponer, confirma disponibilidad con proveedores y espacio de almacenamiento.</p></div>
  </section>;
}
