#!/bin/sh
set -eu

OUTPUT="${1:-apexcareir-backup-$(date +%Y%m%d-%H%M%S).sql}"

docker compose exec -T db pg_dump -U "${POSTGRES_USER:-postgres}" "${POSTGRES_DB:-apexcareir_db}" > "$OUTPUT"
echo "Backup written to $OUTPUT"
