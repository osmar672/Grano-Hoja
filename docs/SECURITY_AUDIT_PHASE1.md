# Auditoría y cambios — Fase 1

## Diagnóstico antes del cambio

- **Alto:** los endpoints de productos, insumos, pedidos, resumen y reportes no exigían sesión.
- **Alto:** no había login, logout ni usuarios internos.
- **Alto:** no había limitación de intentos de autenticación.
- **Medio/alto:** CORS podía aceptar `*`, aunque el sistema pasará a usar cookies.
- **Bajo/positivo:** `.env` estaba ignorado por Git y había `.env.example`, pero faltaba un secreto de sesión requerido.
- **Medio (interfaz):** en móviles el menú lateral generaba desplazamiento incómodo y barras de scroll.

## Archivos creados o modificados

- `backend/package.json`: añade `bcrypt`, `express-session`, `connect-pg-simple`, `express-rate-limit` y `users:seed`.
- `backend/.env.example`: configura secreto de sesión y cuentas iniciales sin contraseñas predeterminadas.
- `schema.sql`, `backend/migrations/001_auth.sql`: tabla `app_users` y roles base.
- `backend/src/services/auth.service.js`: bcrypt, cuenta ficticia para comparar credenciales inexistentes y seguimiento de intentos fallidos.
- `backend/src/controllers/auth.controller.js`: login, sesión regenerada, consulta de usuario y logout.
- `backend/src/routes/auth.routes.js`: rutas de autenticación con rate limiting.
- `backend/src/middleware/requireAuth.js`: exige sesión válida y comprueba que la cuenta siga activa.
- `backend/src/app.js`: sesiones PostgreSQL, cookie HttpOnly/SameSite, CORS exacto y autenticación en rutas de negocio.
- `backend/scripts/seed-users.js`: crea/actualiza tres usuarios a partir de contraseñas definidas en el `.env` local.
- `frontend/src/auth/AuthProvider.jsx`, `frontend/src/components/RequireAuth.jsx`, `frontend/src/services/auth.js`: estado de autenticación y puertas de navegación.
- `frontend/src/pages/LoginPage.jsx`: nueva vista de login con la temática botánica.
- `frontend/src/App.jsx`, `frontend/src/main.jsx`, `frontend/src/services/api.js`, `frontend/src/components/Layout.jsx`: rutas privadas, cookies de sesión, usuario activo y logout.
- `frontend/src/styles.css`: login moderno y navegación móvil fija en la parte inferior para eliminar el desbordamiento del menú.
- `SECURITY.md`, `BITACORA_IA.md`, `README.md`: estado, configuración y registro de IA.

## Validaciones pendientes

La sintaxis se puede revisar con `node --check`. La prueba integral requiere instalar dependencias, levantar PostgreSQL, ejecutar la migración y aprovisionar usuarios localmente. Esta fase no ejecuta un pentest ni completa la autorización por roles, CSRF, HSTS, TLS, escaneo de dependencias o pruebas automáticas.
