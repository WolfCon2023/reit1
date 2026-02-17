#!/usr/bin/env bash
# Remove backups older than BACKUP_RETENTION_DAYS (default 30).
set -e
BACKUP_DIR="${BACKUP_DIR:-/data/backups}"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-30}"
if [ ! -d "$BACKUP_DIR" ]; then
  exit 0
fi
find "$BACKUP_DIR" -maxdepth 1 -name "reit_mongo_*.gz" -mtime +"$RETENTION_DAYS" -delete
echo "$(date -u -Iseconds) Pruned backups older than $RETENTION_DAYS days" >> "${BACKUP_DIR}/logs/backup.log" 2>/dev/null || true
