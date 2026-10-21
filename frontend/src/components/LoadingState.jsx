export default function LoadingState({ message = 'Cargando información…' }) {
  return <div className="state-panel" role="status"><span className="spinner" aria-hidden="true" /><p>{message}</p></div>;
}
