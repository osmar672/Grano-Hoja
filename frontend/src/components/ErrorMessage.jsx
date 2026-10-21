export default function ErrorMessage({ error, onRetry }) {
  if (!error) return null;
  return <div className="error-message" role="alert">
    <div><strong>{error.status ? `Error ${error.status}` : 'No se pudo completar'}</strong><p>{error.message || String(error)}</p></div>
    {onRetry && <button className="button button-secondary button-small" onClick={onRetry}>Reintentar</button>}
  </div>;
}
