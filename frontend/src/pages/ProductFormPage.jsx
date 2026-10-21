import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../services/api.js';
import { useFetch } from '../hooks/useFetch.js';
import ProductForm from '../components/ProductForm.jsx';
import LoadingState from '../components/LoadingState.jsx';
import ErrorMessage from '../components/ErrorMessage.jsx';
export default function ProductFormPage() {
  const { id }=useParams(); const isEditing=Boolean(id); const navigate=useNavigate();
  const { data:product, loading, error:loadError, refetch }=useFetch(isEditing?`/productos/${id}`:null);
  const [saving,setSaving]=useState(false); const [error,setError]=useState(null);
  const save=async(payload)=>{setSaving(true);setError(null);try{const result=isEditing?await api.put(`/productos/${id}`,payload):await api.post('/productos',payload);navigate(`/productos/${result.id}`);}catch(e){setError(e);}finally{setSaving(false);}};
  if(loading)return <LoadingState message="Preparando ficha de producto…"/>;
  if(loadError)return <div className="page-stack"><ErrorMessage error={loadError} onRetry={refetch}/><Link to="/productos" className="text-link">Volver al catálogo</Link></div>;
  return <section className="page-stack narrow-page"><Link className="back-link" to="/productos">← Volver al catálogo</Link><div className="page-heading"><span className="eyebrow">CATÁLOGO Y EXISTENCIAS</span><h1>{isEditing?'Editar producto':'Nuevo producto'}</h1><p>{isEditing?'Actualiza precio, descripción y unidades disponibles.':'Añade una planta, una pieza de mobiliario o un objeto decorativo.'}</p></div><ProductForm initial={product} onSubmit={save} saving={saving} error={error} submitLabel={isEditing?'Guardar cambios':'Crear producto'}/></section>;
}
