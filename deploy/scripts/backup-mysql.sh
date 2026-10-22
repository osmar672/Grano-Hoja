#!/usr/bin/env bash
set -Eeuo pipefail
: "${BACKUP_PASSPHRASE:?Define BACKUP_PASSPHRASE en el entorno antes de ejecutar; no lo guardes en Git}"
OUT_DIR="${BACKUP_DIR:-./backups}"
mkdir -p "$OUT_DIR"
chmod 700 "$OUT_DIR"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
FILE="$OUT_DIR/raiz-madera-${STAMP}.sql.gpg"
umask 077
# El dump se produce dentro del contenedor y se cifra en streaming en el host.
docker compose --env-file .env.production -f compose.production.yaml exec -T db \
  sh -c 'MYSQL_PWD="$MYSQL_APP_PASSWORD" mysqldump --single-transaction --skip-lock-tables --no-tablespaces --user="$MYSQL_APP_USER" "$MYSQL_DATABASE"' \
  | gpg --batch --yes --symmetric --cipher-algo AES256 --passphrase-fd 3 --output "$FILE" 3<<<"$BACKUP_PASSPHRASE"
printf 'Copia MySQL cifrada creada: %s\n' "$FILE"
