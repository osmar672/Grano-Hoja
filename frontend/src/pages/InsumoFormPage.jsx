import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../services/api.js';
import { useFetch } from '../hooks/useFetch.js';
import InsumoForm from '../components/InsumoForm.jsx';
import LoadingState from '../components/LoadingState.jsx';
import ErrorMessage from '../components/ErrorMessage.jsx';
export default function InsumoFormPage() {
  const { id } = useParams(); const isEditing = Boolean(id); const navigate = useNavigate();
  const { data: initial, loading, error: loadError, refetch } = useFetch(isEditing ? `/insumos/${id}` : null);
  const [saving, setSaving] = useState(false); const [error, setError] = useState(null);
  const save = async (payload) => {
    setSaving(true); setError(null);
    try { await (isEditing ? api.put(`/insumos/${id}`, payload) : api.post('/insumos', payload)); navigate('/insumos'); }
    catch (requestError) { setError(requestError); } finally { setSaving(false); }
  };
  if (loading) return <LoadingState />;
  if (loadError) return <div className="page-stack"><ErrorMessage error={loadError} onRetry={refetch} /><Link to="/insumos" className="text-link">Volver a insumos</Link></div>;
  return <section className="page-stack narrow-page"><Link className="back-link" to="/insumos">← Volver a insumos</Link><div className="page-heading"><span className="eyebrow">INVENTARIO</span><h1>{isEditing ? 'Editar insumo' : 'Registrar insumo'}</h1><p>Define la unidad de medida, las existencias y el mínimo de reposición.</p></div><InsumoForm initial={initial} onSubmit={save} saving={saving} error={error} submitLabel={isEditing ? 'Guardar cambios' : 'Crear insumo'} /></section>;
}
