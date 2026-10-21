-- Migración idempotente para instalaciones donde schema.sql ya se cargó.
-- Ejecuta esta migración con el usuario dueño del esquema de la base de datos.
CREATE TABLE IF NOT EXISTS app_users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(254) NOT NULL UNIQUE CHECK (email = LOWER(TRIM(email))),
  display_name VARCHAR(120) NOT NULL CHECK (LENGTH(TRIM(display_name)) > 0),
  password_hash TEXT NOT NULL CHECK (LENGTH(TRIM(password_hash)) > 0),
  role VARCHAR(20) NOT NULL CHECK (role IN ('admin','encargado','caja')),
  active BOOLEAN NOT NULL DEFAULT TRUE,
  failed_login_attempts INTEGER NOT NULL DEFAULT 0 CHECK (failed_login_attempts >= 0),
  locked_until TIMESTAMPTZ,
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS app_users_role_active_idx ON app_users(role, active);


-- Sesiones server-side para express-session / connect-pg-simple.
CREATE TABLE IF NOT EXISTS user_sessions (
  sid VARCHAR NOT NULL PRIMARY KEY,
  sess JSON NOT NULL,
  expire TIMESTAMP(6) NOT NULL
);
CREATE INDEX IF NOT EXISTS user_sessions_expire_idx ON user_sessions(expire);
