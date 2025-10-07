#!/bin/bash
set -e

# Script to snapshot wrangler and postgres state for dotcom app
#
# USAGE:
#   ./snapshot-state.sh [snapshot-name]
#
# DESCRIPTION:
#   Creates a snapshot of the current state of:
#   - Wrangler state (from sync-worker/.wrangler)
#   - Postgres database volume (docker_tlapp_pgdata)
#
#   Snapshots are stored in .snapshots/ directory and can be restored
#   using the restore-state.sh script.
#
# EXAMPLES:
#   ./snapshot-state.sh                    # Creates snapshot with timestamp name
#   ./snapshot-state.sh my-backup         # Creates snapshot named "my-backup"
#
# REQUIREMENTS:
#   - Docker must be running
#   - Postgres volume must exist (docker_tlapp_pgdata)
#   - Wrangler state directory should exist (sync-worker/.wrangler)

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SNAPSHOTS_DIR="$SCRIPT_DIR/.snapshots"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
SNAPSHOT_NAME="${1:-$TIMESTAMP}"
SNAPSHOT_DIR="$SNAPSHOTS_DIR/$SNAPSHOT_NAME"

echo "Creating snapshot: $SNAPSHOT_NAME"
mkdir -p "$SNAPSHOT_DIR"

# Snapshot wrangler state
echo "Snapshotting wrangler state..."
WRANGLER_DIR="$SCRIPT_DIR/sync-worker/.wrangler"
if [ -d "$WRANGLER_DIR" ]; then
  tar -czf "$SNAPSHOT_DIR/wrangler-state.tar.gz" -C "$SCRIPT_DIR/sync-worker" .wrangler
  echo "  ✓ Wrangler state saved to $SNAPSHOT_DIR/wrangler-state.tar.gz"
else
  echo "  ⚠ No wrangler state found at $WRANGLER_DIR"
fi

# Snapshot postgres volume
echo "Snapshotting postgres volume..."
VOLUME_NAME="docker_tlapp_pgdata"

# Check if volume exists
if ! docker volume inspect "$VOLUME_NAME" > /dev/null 2>&1; then
  echo "  ⚠ Docker volume $VOLUME_NAME not found"
else
  # Export postgres volume to tar
  docker run --rm \
    -v "$VOLUME_NAME:/data" \
    -v "$SNAPSHOT_DIR:/backup" \
    alpine \
    tar -czf /backup/postgres-data.tar.gz -C /data .

  echo "  ✓ Postgres data saved to $SNAPSHOT_DIR/postgres-data.tar.gz"
fi

echo ""
echo "Snapshot complete: $SNAPSHOT_NAME"
echo "Location: $SNAPSHOT_DIR"
