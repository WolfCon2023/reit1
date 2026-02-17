#!/usr/bin/env bash
# Restore from a .gz archive. Usage: MONGODB_URI=... ./mongo-restore.sh /data/backups/reit_mongo_2025-02-17_120000Z.gz
set -e
MONGODB_URI="${MONGODB_URI:-}"
ARCHIVE="$1"
if [ -z "$MONGODB_URI" ] || [ -z "$ARCHIVE" ] || [ ! -f "$ARCHIVE" ]; then
  echo "Usage: MONGODB_URI=... $0 <path-to-.gz-archive>"
  exit 1
fi
mongorestore --uri="$MONGODB_URI" --archive="$ARCHIVE" --gzip --drop
