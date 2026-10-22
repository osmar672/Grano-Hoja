# Google OAuth en Grano & Hoja

## Google Cloud Console

En **Google Auth Platform → Clients**, crea o revisa un cliente OAuth de tipo Web application.

Desarrollo local:
- JavaScript origin: `http://localhost:5173`
- Redirect URI: `http://localhost:3001/api/auth/google/callback`

Producción:
- JavaScript origin: `https://TU_DOMINIO`
- Redirect URI: `https://TU_DOMINIO/api/auth/google/callback`

Si la pantalla OAuth está en modo de prueba, añade las cuentas de prueba bajo Audience/Test users. El redirect URI debe coincidir exactamente, protocolo incluido.

## Secretos

Copia `backend/.env.example` a `backend/.env` y coloca `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` y `GOOGLE_REDIRECT_URI`. El Client ID no es un secreto, pero el Client Secret sí. Si el secreto se compartió o subió por accidente, revócalo en Google Cloud y crea uno nuevo. Nunca lo coloques en variables `VITE_` ni en un ZIP público.

Para desarrollo local, utiliza `scripts/configurar-google-local.ps1` si quieres copiar la configuración MySQL del proyecto al backend y pedir el nuevo secreto por entrada oculta. El script no crea las credenciales OAuth; se deben obtener de Google Cloud Console.

## MySQL y sesiones

La versión actual utiliza MySQL 8.4 y `express-mysql-session`, no PostgreSQL. Primero ejecuta `docker compose up -d db`, luego `backend/npm install` y `npm run dev`. El primer arranque de un volumen nuevo carga `schema.sql`, que ya incluye `app_users.google_sub` y la tabla de sesiones. En ese caso **no vuelvas a ejecutar las migraciones 001/002/003**: las migraciones 001–003 son para actualizar bases creadas por versiones previas y algunas operaciones `ALTER TABLE` no se deben repetir.

Para una base existente, revisa cada migración antes de ejecutar. Los comandos MySQL habituales son:

```powershell
docker compose exec -T db mysql -u grano_app -p grano_hoja < backend/migrations/002_google_oauth.sql
```

> PowerShell no siempre trata la redirección `<` igual que CMD. Una alternativa es `Get-Content backend/migrations/002_google_oauth.sql | docker compose exec -T db mysql -u grano_app -p grano_hoja`, pero el cliente puede no solicitar el password interactivamente a través de stdin. Para el primer esquema nuevo, usa los scripts de inicialización de Compose.

## Flujo esperado

El usuario pulsa Google, el backend crea `state`, `nonce` y PKCE, Google devuelve un código a la URI de callback, el backend verifica el ID token y el correo, regenera la sesión y redirige a `FRONTEND_URL`. Registro nuevo recibe rol `caja`; no se permite que el usuario se asigne privilegios administrativos.
