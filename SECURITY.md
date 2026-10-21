# SECURITY.md — Grano & Hoja

Este documento distingue lo implementado en la **Fase 1 (configuración y autenticación)** de las medidas que quedan para fases posteriores. No representa una certificación ni un pentest completo.

## Estado general

| Medida | Estado | Evidencia / siguiente paso |
|---|---|---|
| Secretos fuera del repositorio | Implementada en esta fase | `backend/.env.example`, `.gitignore`; genera `SESSION_SECRET` localmente |
| Hash de contraseñas | Implementada | bcrypt con 12 rondas; no se guardan contraseñas en texto plano |
| Varios usuarios y roles base | Implementada como aprovisionamiento | `npm run users:seed`; roles `admin`, `encargado`, `caja` |
| Sesiones server-side persistidas | Implementada | `express-session` + tabla PostgreSQL `user_sessions` mediante `connect-pg-simple` |
| Cookie de sesión | Implementada parcialmente | `HttpOnly`, `SameSite=Strict`, `Secure` en producción; HTTPS/HSTS se configura en Fase 3 |
| Expiración y logout | Implementada | 30 min renovables por actividad; logout destruye la sesión del servidor |
| Regeneración de ID al login | Implementada | `req.session.regenerate()` antes de establecer usuario |
| Limitación de intentos | Implementada | límite por IP y bloqueo de cuenta tras 5 fallos por 15 min |
| Autenticación en endpoints de negocio | Implementada | `requireAuth` protege productos, insumos, pedidos, resumen y reportes |
| Autorización por rol | Pendiente — Fase 2 | Los roles existen, pero en esta fase todos los usuarios autenticados pueden acceder a las operaciones existentes |
| Validación de esquemas completa | Pendiente — Fase 2 | Aplicar Zod/Joi/express-validator en todas las entradas |
| CSRF explícito | Pendiente — Fase 3 | SameSite no sustituye la implementación y prueba de una defensa CSRF completa |
| Helmet, CSP, HSTS y cabeceras finales | Pendiente — Fase 3 | Ajustar política a Vite/API y al HTTPS del despliegue |
| HTTPS/redirección en producción | Pendiente — Fase 3 | Configurar proxy/hosting y certificado TLS; `Secure` necesita HTTPS real |
| Auditoría total de dependencias (`npm audit`) | Pendiente — Fase 4 | Ejecutar desde `backend/` y `frontend/` después de instalar |
| Logs de seguridad y alertas | Pendiente — Fase 4 | No incluir contraseñas, cookies, sesión ni tokens en logs |
| Pruebas automatizadas de seguridad | Pendiente — Fase 5 | Probar rate limit, permisos, inyección, XSS y cabeceras |
| 2FA para administración | Pendiente de decisión | No se configuró un proveedor TOTP/2FA sin una decisión explícita |
| Recuperación de contraseña | No disponible | No existe proveedor de correo/SMS configurado; no se expone endpoint inseguro |
| Registro público | No disponible intencionalmente | Las cuentas se crean por script de administración; no hay registro abierto |
| Backups cifrados y restauración | Pendiente de operación | Documentar, automatizar y probar en el entorno de despliegue |
| Política de privacidad Ley 8968 | Pendiente — Fase 5 | Adaptar texto legal al tratamiento real y revisión responsable |

## Configuración local

1. Copia `backend/.env.example` a `backend/.env`.
2. En `backend/.env`, define `DATABASE_URL`, `CORS_ORIGIN` y `SESSION_SECRET`.
3. Genera un secreto de sesión con Node.js:

   ```powershell
   node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
   ```

4. Coloca la salida únicamente en `backend/.env` como `SESSION_SECRET=...`. No la guardes en Git ni la incluyas en capturas.
5. Define tres correos y tres contraseñas diferentes en las variables `SEED_*` de `backend/.env`. No uses una contraseña de ejemplo o compartida.
6. Ejecuta la migración de autenticación si la base ya estaba creada, instala dependencias y aprovisiona cuentas usando los comandos del README.

## Política de contraseña para cuentas iniciales

- Al menos 12 caracteres/bytes.
- Incluye una letra mayúscula, una minúscula y un número.
- Máximo de 72 bytes por la semántica de bcrypt.
- Cada rol debe tener contraseña diferente. No se imprimen hashes ni contraseñas.

## Roles iniciales

- `admin`: administración.
- `encargado`: encargado de cafetería.
- `caja`: personal de caja.

**Aviso de alcance:** Fase 1 crea los roles, pero la matriz de permisos del servidor se implementará en Fase 2. No expongas la aplicación a Internet hasta completar las fases de autorización, cabeceras/CSRF/HTTPS, dependencias y pruebas.

## Respuesta ante incidentes

Si una clave o `SESSION_SECRET` llega a Git, considera que está comprometida: retírala del código, rota la clave en el entorno, invalida sesiones existentes y revisa el historial del repositorio. Borrar el archivo en un commit posterior no elimina la exposición anterior.
