-- MySQL 8.4: autenticación local. Ejecuta solo en una base MySQL que no tenga estas tablas.
CREATE TABLE IF NOT EXISTS app_users (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(254) NOT NULL UNIQUE,
  display_name VARCHAR(120) NOT NULL,
  password_hash VARCHAR(255) NULL,
  role VARCHAR(20) NOT NULL,
  active TINYINT(1) NOT NULL DEFAULT 1,
  failed_login_attempts INT UNSIGNED NOT NULL DEFAULT 0,
  locked_until DATETIME(3) NULL,
  last_login_at DATETIME(3) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  CONSTRAINT app_users_email_normalized CHECK (email=LOWER(TRIM(email))),
  CONSTRAINT app_users_name_nonempty CHECK (CHAR_LENGTH(TRIM(display_name))>0),
  CONSTRAINT app_users_role_allowed CHECK (role IN ('admin','encargado','caja')),
  KEY app_users_role_active_idx (role,active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
-- El store de sesiones tiene createDatabaseTable=false; esta tabla debe existir antes del primer login.
CREATE TABLE IF NOT EXISTS user_sessions (
  session_id VARCHAR(128) NOT NULL PRIMARY KEY,
  expires INT UNSIGNED NOT NULL,
  data MEDIUMTEXT NULL,
  KEY user_sessions_expire_idx (expires)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;
