#!/usr/bin/env bash
set -euo pipefail

BACKUP_DIR="/backup"
FILENAME="kasir-$(date +%F).sql.gz"

mkdir -p "$BACKUP_DIR"
docker exec postgres pg_dump -U postgres kasir | gzip > "$BACKUP_DIR/$FILENAME"
echo "Backup saved: $BACKUP_DIR/$FILENAME"

# Hapus backup lebih dari 14 hari
find "$BACKUP_DIR" -name "kasir-*.sql.gz" -mtime +14 -delete
