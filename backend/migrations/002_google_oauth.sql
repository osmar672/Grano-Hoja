-- Habilita cuentas registradas con Google OAuth. Ejecutar una vez en bases existentes.
-- Las cuentas locales siguen usando bcrypt; las cuentas Google no necesitan password_hash.
ALTER TABLE app_users ALTER COLUMN password_hash DROP NOT NULL;
ALTER TABLE app_users ADD COLUMN IF NOT EXISTS google_sub VARCHAR(255);
CREATE UNIQUE INDEX IF NOT EXISTS app_users_google_sub_uq
  ON app_users(google_sub) WHERE google_sub IS NOT NULL;
