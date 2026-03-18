#!/bin/bash
# Database backup script

set -e

# Configuration
BACKUP_DIR="./backups"
DB_PATH="${DATABASE_PATH:-./data/truth-tutor.db}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/truth-tutor_$TIMESTAMP.db"
RETENTION_DAYS=30

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Backup database
echo "Backing up database to $BACKUP_FILE..."
sqlite3 "$DB_PATH" ".backup '$BACKUP_FILE'"

# Compress backup
echo "Compressing backup..."
gzip "$BACKUP_FILE"

# Remove old backups
echo "Removing backups older than $RETENTION_DAYS days..."
find "$BACKUP_DIR" -name "truth-tutor_*.db.gz" -mtime +$RETENTION_DAYS -delete

# List recent backups
echo "Recent backups:"
ls -lh "$BACKUP_DIR" | tail -5

echo "Backup completed successfully!"
