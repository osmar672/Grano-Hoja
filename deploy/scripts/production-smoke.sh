#!/usr/bin/env bash
set -Eeuo pipefail
: "${BASE_URL:?Define BASE_URL=https://tu-dominio.com}"
node scripts/production-smoke.mjs
