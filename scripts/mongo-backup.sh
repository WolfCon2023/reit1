#!/usr/bin/env bash
# Run mongodump and gzip to BACKUP_DIR. Use MONGODB_URI and BACKUP_DIR from env.
set -e
BACKUP_DIR="${BACKUP_DIR:-/data/backups}"
MONGODB_URI="${MONGODB_URI:-}"
mkdir -p "$BACKUP_DIR"
mkdir -p "$BACKUP_DIR/logs"
if [ -z "$MONGODB_URI" ]; then
  echo "MONGODB_URI is required"
  exit 1
fi
TIMESTAMP=$(date -u +"%Y-%m-%d_%H%M%SZ")
FILENAME="reit_mongo_${TIMESTAMP}.gz"
FILEPATH="${BACKUP_DIR}/${FILENAME}"
mongodump --uri="$MONGODB_URI" --archive="$FILEPATH" --gzip
echo "$(date -u -Iseconds) Backup completed: $FILENAME" >> "${BACKUP_DIR}/logs/backup.log"
