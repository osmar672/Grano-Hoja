#!/usr/bin/env bash
set -Eeuo pipefail
: "${APP_DB_USER:?APP_DB_USER es obligatorio}"
: "${APP_DB_PASSWORD:?APP_DB_PASSWORD es obligatorio}"
: "${POSTGRES_DB:?POSTGRES_DB es obligatorio}"

# Use psql variables + format() to quote role/database/password safely.
psql -v ON_ERROR_STOP=1 \
  --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" \
  -v db_admin="$POSTGRES_USER" \
  -v app_db_user="$APP_DB_USER" \
  -v app_db_password="$APP_DB_PASSWORD" \
  -v database_name="$POSTGRES_DB" <<'SQL'
SELECT format('CREATE ROLE %I LOGIN PASSWORD %L', :'app_db_user', :'app_db_password') \gexec
SELECT format('GRANT CONNECT ON DATABASE %I TO %I', :'database_name', :'app_db_user') \gexec
SELECT format('GRANT USAGE ON SCHEMA public TO %I', :'app_db_user') \gexec
SELECT format('ALTER DEFAULT PRIVILEGES FOR ROLE %I IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO %I', :'db_admin', :'app_db_user') \gexec
SELECT format('ALTER DEFAULT PRIVILEGES FOR ROLE %I IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO %I', :'db_admin', :'app_db_user') \gexec
SQL
