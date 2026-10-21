export default function MetricCard({ label, value, note, icon = '◈' }) {
  return <article className="metric-card"><div className="metric-top"><span>{label}</span><span className="metric-icon" aria-hidden="true">{icon}</span></div><strong className="metric-value">{value}</strong>{note && <small>{note}</small>}</article>;
}
