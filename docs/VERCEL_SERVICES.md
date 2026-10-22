# Vercel Services — Arquitectura, rutas y bindings

## Configuración final propuesta

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "services": {
    "backend": {
      "root": "backend/",
      "framework": "express",
      "entrypoint": "index.js",
      "installCommand": "npm install",
      "functions": {
        "index.js": {
          "maxDuration": 60
        }
      }
    },
    "frontend": {
      "root": "frontend/",
      "framework": "vite",
      "installCommand": "npm install --include=dev",
      "buildCommand": "npm run build",
      "outputDirectory": "dist",
      "rewrites": [
        {
          "source": "/(.*)",
          "destination": "/index.html"
        }
      ]
    }
  },
  "rewrites": [
    {
      "source": "/api/(.*)",
      "destination": { "service": "backend" }
    },
    {
      "source": "/(.*)",
      "destination": { "service": "frontend" }
    }
  ],
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        { "key": "X-Content-Type-Options", "value": "nosniff" },
        { "key": "X-Frame-Options", "value": "DENY" },
        { "key": "Referrer-Policy", "value": "strict-origin-when-cross-origin" },
        { "key": "Permissions-Policy", "value": "camera=(), microphone=(), geolocation=()" },
        { "key": "Strict-Transport-Security", "value": "max-age=15552000; includeSubDomains" },
        { "key": "Content-Security-Policy", "value": "default-src 'self'; base-uri 'self'; connect-src 'self'; font-src 'self' data:; form-action 'self'; frame-ancestors 'none'; img-src 'self' data: blob:; object-src 'none'; script-src 'self'; script-src-attr 'none'; style-src 'self' 'unsafe-inline'; upgrade-insecure-requests" }
      ]
    }
  ]
}
```

## Servicios y alcance público

| Servicio | Nombre en `vercel.json` | Root | Alcance público | Motivo |
|---|---|---|---|---|
| Express API | `backend` | `backend/` | `/api/*` | El navegador necesita pedir la API; Express exige sesión/permisos/CSRF según operación. |
| React SPA | `frontend` | `frontend/` | `/*` excepto `/api/*` | Es la interfaz pública; los datos sensibles se protegen en la API, no ocultando botones solamente. |
| MySQL | No es un Vercel Service | Proveedor MySQL externo | No público al navegador | Express se conecta usando `DB_HOST`/TLS. |
| n8n | No es un Vercel Service | n8n externo por HTTPS | Webhook publicado protegido por Header Auth | Express invoca `N8N_WEBHOOK_URL`; n8n llama a los reportes del backend con token de servicio. |

## Por qué no se añaden bindings ahora

Vercel service bindings están destinados a llamadas servidor-a-servidor entre dos servicios declarados dentro del mismo proyecto Vercel. Aquí el frontend es Vite estático y las llamadas se originan en el navegador mediante `/api/*`, no en una función server-side del frontend; el backend llama a MySQL y n8n, que son proveedores externos y no entradas dentro de `services`.

Por esa razón no hay actualmente un binding válido que declarar. No se inventa `FRONTEND_URL` o `BACKEND_URL` generado por Vercel. Para esta arquitectura:

- React usa `VITE_API_URL` no definido en producción, por lo que el cliente recurre a `/api`.
- El backend utiliza `DB_HOST` y demás variables MySQL.
- El backend utiliza `N8N_WEBHOOK_URL` y `N8N_API_BASE_URL` de Vercel.
- n8n accede a `GET /api/reportes/productos-bajo-stock` y `GET /api/reportes/ventas-semana` con `N8N_API_SERVICE_TOKEN`.

Si se añade un tercer servicio server-side (por ejemplo, un worker o una API interna Vercel), debe declararse en `services`, y el servicio que lo invoque debe declarar el binding con los cuatro campos exigidos por Vercel.

## Qué configurar en Vercel

1. Importar el repositorio desde su raíz `./`.
2. En Framework Preset seleccionar **Services**. Esta característica está en beta y el proyecto/cuenta debe tener acceso.
3. No rellenar comandos globales de instalación, build o output; esas opciones ya son específicas de cada servicio en `vercel.json`.
4. Añadir las variables de `.env.vercel.example` en Project Settings → Environment Variables.
5. Importar `schema.production.sql` en MySQL remoto con TLS.
6. Añadir la URI de callback de Google con el dominio real: `https://TU_PROYECTO.vercel.app/api/auth/google/callback`.
7. Configurar credenciales del workflow n8n y usar el dominio Vercel en `N8N_API_BASE_URL`.
8. Ejecutar `node scripts/check-vercel.mjs` y `node scripts/check-integration.mjs` antes del despliegue.

Referencias oficiales:
- https://vercel.com/docs/services
- https://vercel.com/kb/guide/vercel-services
