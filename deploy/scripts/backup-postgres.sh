#!/usr/bin/env bash
set -Eeuo pipefail
: "${BACKUP_PASSPHRASE:?Define BACKUP_PASSPHRASE en el entorno antes de ejecutar; no lo guardes en Git}"
OUT_DIR="${BACKUP_DIR:-./backups}"
mkdir -p "$OUT_DIR"
chmod 700 "$OUT_DIR"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
FILE="$OUT_DIR/raiz-madera-${STAMP}.dump.gpg"
umask 077
# La copia cifrada se crea en streaming; la contraseña no se guarda en los archivos del proyecto.
docker compose --env-file .env.production -f compose.production.yaml exec -T db \
  sh -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc' \
  | gpg --batch --yes --symmetric --cipher-algo AES256 --passphrase-fd 3 --output "$FILE" 3<<<"$BACKUP_PASSPHRASE"
printf 'Copia cifrada creada: %s\n' "$FILE"
