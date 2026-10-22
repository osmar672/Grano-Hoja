-- MySQL 8.4: ejecutar una sola vez si app_users existía antes de Google OAuth.
ALTER TABLE app_users MODIFY password_hash VARCHAR(255) NULL;
ALTER TABLE app_users ADD COLUMN google_sub VARCHAR(255) NULL;
CREATE UNIQUE INDEX app_users_google_sub_uq ON app_users(google_sub);
