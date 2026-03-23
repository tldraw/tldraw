#!/usr/bin/env bash
# Stops the tldraw diagram viewer if running.

set -euo pipefail

SKILL_DIR="$(cd "$(dirname "$0")/.." && pwd)"
PIDFILE="$SKILL_DIR/.viewer.pid"

if [ -f "$PIDFILE" ]; then
  pid=$(cat "$PIDFILE")
  if kill -0 "$pid" 2>/dev/null; then
    kill "$pid"
    echo "Viewer stopped (pid $pid)"
  fi
  rm -f "$PIDFILE"
else
  echo "No viewer running"
fi
