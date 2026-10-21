import { api } from './api.js';
const DEFAULT_REQUEST='Analiza los productos por debajo del mínimo y las ventas de los últimos siete días. Sugiere cantidades de reposición justificadas para plantas, muebles y decoración.';
export async function generarSugerenciaCompra(solicitud=DEFAULT_REQUEST){
  if(typeof solicitud!=='string'||!solicitud.trim()||solicitud.trim().length>1000||/[<>]/.test(solicitud)){const error=new Error('Escribe una solicitud válida de hasta 1000 caracteres, sin marcado HTML.');error.status=400;throw error;}
  const response=await api.post('/agente/sugerencia-compra',{solicitud:solicitud.trim()});
  if(!response||response.ok!==true||!response.data||!('error' in response)){const error=new Error(response?.error||'La respuesta del asistente no cumple el contrato esperado.');error.status=502;throw error;}
  return response.data;
}
