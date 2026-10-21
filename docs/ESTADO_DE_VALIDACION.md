# Estado de validación — Raíz & Madera

## Revisiones realizadas al preparar este ZIP

- Se revisó el esquema SQL, las rutas de API y los servicios de inventario/ventas respecto al nuevo dominio.
- Se incluyó un test de esquemas para categorías, existencias, IDs, login, pagos, validación anti-HTML y autorización por rol.
- Se comprobaron estructuralmente los JSON del workflow y la colección Postman durante la generación del ZIP.
- La interfaz React quedó adaptada al catálogo de plantas, muebles y decoración; se revisaron imports relativos y sintaxis JSX/JS con un parser estático.

## Pendiente de verificación en tu computadora

- `npm install`, `npm test`, `npm run check` y `npm run build` con dependencias reales.
- Arranque de PostgreSQL, carga de `schema.sql`, sesiones y seed de usuarios.
- Casos transaccionales simultáneos, stock insuficiente y anulación a los 16 minutos.
- Importación/ejecución real del workflow con credencial propia de modelo y n8n accesible desde la API.
- `npm audit`, OWASP ZAP y comprobación de HTTPS/cabeceras al desplegar.

Esta documentación no declara una prueba como pasada si no se ejecutó en un entorno funcional.


## Actualización: login y registro con Google

- [x] Se añadió flujo OAuth del lado del servidor con `state`, `nonce`, PKCE S256 y verificación de correo/ID token.
- [x] Se añadieron botones de Google para acceder y crear cuenta en `/login`.
- [x] Registro nuevo se limita al rol `caja`.
- [x] Variables de Google documentadas solo en backend `.env.example`.
- [x] Migración 002 y soporte en `schema.sql` para identificadores Google.
- [ ] Pendiente: configurar las credenciales OAuth reales en Google Cloud Console y probar el callback en el equipo local; esas credenciales no pueden generarse automáticamente.
