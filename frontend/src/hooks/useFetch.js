import { useCallback, useEffect, useState } from 'react';
import { apiRequest } from '../services/api.js';

// Refetch cambia el contador; AbortController evita actualizar tras desmontar o cambiar de ruta.
export function useFetch(path) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(Boolean(path));
  const [error, setError] = useState(null);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    if (!path) { setData(null); setError(null); setLoading(false); return undefined; }
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    apiRequest(path, { signal: controller.signal })
      .then((result) => setData(result))
      .catch((requestError) => { if (requestError.name !== 'AbortError') setError(requestError); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [path, reload]);

  const refetch = useCallback(() => setReload((value) => value + 1), []);
  return { data, loading, error, refetch };
}
