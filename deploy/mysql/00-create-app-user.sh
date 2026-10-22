#!/usr/bin/env bash
set -Eeuo pipefail
: "${MYSQL_DATABASE:?MYSQL_DATABASE es obligatorio}"
: "${MYSQL_APP_USER:?MYSQL_APP_USER es obligatorio}"
: "${MYSQL_APP_PASSWORD:?MYSQL_APP_PASSWORD es obligatorio}"
# Identificadores limitados para evitar que valores de entorno alteren el SQL de bootstrap.
[[ "$MYSQL_DATABASE" =~ ^[A-Za-z0-9_]+$ ]] || { echo 'MYSQL_DATABASE contiene caracteres no permitidos' >&2; exit 1; }
[[ "$MYSQL_APP_USER" =~ ^[A-Za-z0-9_]+$ ]] || { echo 'MYSQL_APP_USER contiene caracteres no permitidos' >&2; exit 1; }
[[ "$MYSQL_APP_PASSWORD" =~ ^[A-Za-z0-9_-]{32,}$ ]] || { echo 'MYSQL_APP_PASSWORD debe ser un secreto URL-safe de al menos 32 caracteres' >&2; exit 1; }
mysql --protocol=socket --user=root --password="$MYSQL_ROOT_PASSWORD" <<SQL
CREATE USER IF NOT EXISTS '${MYSQL_APP_USER}'@'%' IDENTIFIED BY '${MYSQL_APP_PASSWORD}';
GRANT SELECT, INSERT, UPDATE, DELETE ON \`${MYSQL_DATABASE}\`.* TO '${MYSQL_APP_USER}'@'%';
FLUSH PRIVILEGES;
SQL
