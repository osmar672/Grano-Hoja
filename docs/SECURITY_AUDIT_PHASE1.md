> Documento histórico, escrito cuando el proyecto se llamaba Raíz & Madera.

# Auditoría inicial de seguridad — Raíz & Madera

Hallazgos que motivaron las fases de seguridad:

- **Alto:** inicialmente no existía login ni sesión; se incorporaron sesiones server-side con bcrypt y limitación de intentos.
- **Alto:** las rutas comerciales inicialmente eran públicas; se añadieron autenticación y roles en Express.
- **Alto:** se añadieron esquemas Zod estrictos para entradas y se mantiene el SQL parametrizado.
- **Medio:** CORS se restringe a orígenes explícitos y no acepta comodín con cookies.
- **Pendiente:** cabeceras Helmet/CSP, HTTPS real, HSTS y protección CSRF según entorno.
- **Pendiente:** ejecutar análisis de dependencias, escáner dinámico y restauración de backup en entorno real.

Este documento es un registro de evolución del código, no una certificación de seguridad.
