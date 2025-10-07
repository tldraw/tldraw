#!/bin/bash
set -e

# Script to restore wrangler and postgres state for dotcom app

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SNAPSHOTS_DIR="$SCRIPT_DIR/.snapshots"

# Show available snapshots if no argument provided
if [ -z "$1" ]; then
  echo "Available snapshots:"
  if [ -d "$SNAPSHOTS_DIR" ]; then
    ls -1 "$SNAPSHOTS_DIR" | while read -r snapshot; do
      echo "  - $snapshot"
    done
  else
    echo "  (none found)"
  fi
  echo ""
  echo "Usage: $0 <snapshot-name>"
  exit 1
fi

SNAPSHOT_NAME="$1"
SNAPSHOT_DIR="$SNAPSHOTS_DIR/$SNAPSHOT_NAME"

if [ ! -d "$SNAPSHOT_DIR" ]; then
  echo "Error: Snapshot not found: $SNAPSHOT_NAME"
  exit 1
fi

echo "Restoring from snapshot: $SNAPSHOT_NAME"
echo ""

# Restore wrangler state
WRANGLER_SNAPSHOT="$SNAPSHOT_DIR/wrangler-state.tar.gz"
if [ -f "$WRANGLER_SNAPSHOT" ]; then
  echo "Restoring wrangler state..."
  WRANGLER_DIR="$SCRIPT_DIR/sync-worker/.wrangler"

  # Remove existing wrangler state
  if [ -d "$WRANGLER_DIR" ]; then
    rm -rf "$WRANGLER_DIR"
    echo "  ✓ Removed existing wrangler state"
  fi

  # Extract snapshot
  mkdir -p "$SCRIPT_DIR/sync-worker"
  tar -xzf "$WRANGLER_SNAPSHOT" -C "$SCRIPT_DIR/sync-worker"
  echo "  ✓ Wrangler state restored"
else
  echo "  ⚠ No wrangler snapshot found"
fi

# Restore postgres volume
POSTGRES_SNAPSHOT="$SNAPSHOT_DIR/postgres-data.tar.gz"
if [ -f "$POSTGRES_SNAPSHOT" ]; then
  echo "Restoring postgres volume..."
  VOLUME_NAME="docker_tlapp_pgdata"

  # Check if containers are using the volume
  CONTAINERS_USING_VOLUME=$(docker ps -a --filter volume="$VOLUME_NAME" --format "{{.Names}}" 2>/dev/null || echo "")
  if [ -n "$CONTAINERS_USING_VOLUME" ]; then
    echo "  ! Stopping and removing containers using volume: $CONTAINERS_USING_VOLUME"
    docker stop $CONTAINERS_USING_VOLUME || true
    docker rm $CONTAINERS_USING_VOLUME || true
  fi

  # Remove existing volume
  if docker volume inspect "$VOLUME_NAME" > /dev/null 2>&1; then
    docker volume rm "$VOLUME_NAME" || {
      echo "  ⚠ Could not remove volume. Make sure all containers are stopped."
      exit 1
    }
    echo "  ✓ Removed existing volume"
  fi

  # Create new volume
  docker volume create "$VOLUME_NAME"
  echo "  ✓ Created new volume"

  # Restore data
  docker run --rm \
    -v "$VOLUME_NAME:/data" \
    -v "$SNAPSHOT_DIR:/backup" \
    alpine \
    tar -xzf /backup/postgres-data.tar.gz -C /data

  echo "  ✓ Postgres data restored"

  # Note: Containers were removed and need to be recreated (e.g., via docker-compose up)
else
  echo "  ⚠ No postgres snapshot found"
fi

echo ""
echo "Restore complete!"
