# Backend — Grano & Hoja

Esta carpeta contendrá la API Node.js + Express. En esta versión de Fase 1 solo se documenta la arquitectura; el servidor todavía no está implementado.

## Arquitectura prevista

```text
backend/
├── .env.example
├── package.json
└── src/
    ├── app.js
    ├── server.js
    ├── db.js
    ├── routes/
    ├── controllers/
    ├── services/
    ├── middlewares/
    └── utils/
```

El script de base de datos y los datos de ejemplo estarán en `../schema.sql` (raíz del repositorio), para que sea fácil de identificar en el checkpoint de la rúbrica. Las rutas propuestas están en [docs/FASE_1_BACKEND.md](../docs/FASE_1_BACKEND.md).

## Seguridad y reglas de implementación

- No subir `.env` ni contraseñas; mantener `.env.example` sin secretos.
- Usar consultas parametrizadas de PostgreSQL (`$1`, `$2`, etc.).
- Aplicar lista blanca a los nombres de columna usados para ordenar.
- Las confirmaciones y anulaciones de pedidos deben usar transacciones con `BEGIN`, `COMMIT`, `ROLLBACK` y `release()` en `finally`.
- Validar las reglas de negocio en `services/`, no solo en React.
- Traducir errores conocidos de PostgreSQL a códigos HTTP consistentes y `{ "error": "mensaje" }`.

La API no debe considerarse lista hasta ejecutar los casos de `tests/README.md` y guardar evidencia reproducible.
