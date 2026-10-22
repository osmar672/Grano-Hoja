# Publicación en Vercel

La configuración vigente usa **Vercel Services**. Sigue la guía completa en [`VERCEL_SERVICES.md`](VERCEL_SERVICES.md) o en [`../PUBLICAR_EN_VERCEL.md`](../PUBLICAR_EN_VERCEL.md).

No sigas guías anteriores que hablen de un único proyecto Express que empaqueta React en `public/`: esa arquitectura fue retirada de esta versión. La configuración raíz de servicios está en `vercel.json`, con `backend` para `/api/*` y `frontend` para el resto de las rutas.
