# Configurar registro e inicio de sesión con Google

## Flujo

- `GET /api/auth/google/start?intent=login`: solo accede con Google una cuenta previamente registrada y vinculada.
- `GET /api/auth/google/start?intent=register`: verifica el perfil Google y crea una cuenta con rol `caja`.
- `GET /api/auth/google/callback`: valida state, nonce, PKCE y firma/audiencia del ID token; regenera la sesión y vuelve al frontend.

## Configuración

1. Google Cloud Console → APIs & Services → OAuth consent screen: configura la app e incluye tu Gmail como usuario de prueba mientras está en modo Testing.
2. Credentials → Create credentials → OAuth client ID → Web application.
3. Authorized redirect URI para desarrollo: `http://localhost:3001/api/auth/google/callback`.
4. Copia `backend/.env.example` a `backend/.env` y completa `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI` y `FRONTEND_URL`.
5. Corre la migración con: `Get-Content backend/migrations/002_google_oauth.sql | docker compose exec -T db psql -U postgres -d raiz_madera`.
6. Reinicia API: `npm run dev` desde `backend`. Usa los botones de la pantalla `/login`.

## Reglas de seguridad

- No pidas ni guardes la contraseña de Google.
- El ID token se valida en el backend; un correo no verificado se rechaza.
- Se solicitan solo `openid`, `email` y `profile`; no se lee Gmail.
- `GOOGLE_CLIENT_SECRET` nunca va en el frontend, no se nombra con prefijo `VITE_` y no se sube a Git.
- Las cuentas creadas usan rol inicial `caja`; no hay registro autoadministrado. Las cuentas locales existentes no se vinculan por coincidencia de email.
- Las cuentas nuevas pueden registrarse solo una vez por identificador de Google/email; los intentos se limitan con rate limiting.
- Para producción usa un callback HTTPS exacto y configura `NODE_ENV=production`, el proxy confiable y HTTPS en el hosting.
