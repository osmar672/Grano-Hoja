# Frontend — Grano & Hoja

Esta carpeta queda reservada para la aplicación React con Vite. En la Fase 1 solo se define la arquitectura; el código se empezará en la fase siguiente que corresponda.

## Arquitectura prevista

```text
frontend/
├── .env.example
├── package.json
├── index.html
└── src/
    ├── main.jsx
    ├── App.jsx
    ├── routes/
    ├── pages/
    ├── components/
    ├── hooks/
    ├── services/
    └── styles/
```

Las llamadas a la API se centralizarán en `src/services/api.js`. Las rutas, vistas, componentes y el mapeo a los endpoints propuestos están en [docs/FASE_1_FRONTEND.md](../docs/FASE_1_FRONTEND.md).

## Variables de entorno previstas

- `VITE_API_URL`: origen/base URL de la API Express.
- `VITE_N8N_WEBHOOK_URL`: URL del webhook de n8n.

Los valores reales se configurarán en la fase de implementación. No se deben subir archivos `.env` locales.
