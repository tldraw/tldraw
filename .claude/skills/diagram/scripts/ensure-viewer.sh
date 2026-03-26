#!/usr/bin/env bash
# Ensures the tldraw diagram viewer is running, starts it if not.
# Usage: bash .claude/skills/diagram/scripts/ensure-viewer.sh [--open]

set -euo pipefail

SKILL_DIR="$(cd "$(dirname "$0")/.." && pwd)"
VIEWER_DIR="$SKILL_DIR/viewer"
PORT=5799
PIDFILE="$SKILL_DIR/.viewer.pid"
LOGFILE="$SKILL_DIR/.viewer.log"

REPO_ROOT="$(cd "$SKILL_DIR/../.." && pwd)"
mkdir -p "$REPO_ROOT/tmp/diagrams"

# Install deps if needed
if [ ! -d "$VIEWER_DIR/node_modules" ]; then
  echo "Installing diagram viewer dependencies..."
  cd "$VIEWER_DIR" && npm install --silent
fi

is_running() {
  if [ -f "$PIDFILE" ]; then
    local pid
    pid=$(cat "$PIDFILE")
    if kill -0 "$pid" 2>/dev/null; then
      return 0
    fi
    rm -f "$PIDFILE"
  fi
  if lsof -i ":$PORT" -sTCP:LISTEN >/dev/null 2>&1; then
    return 0
  fi
  return 1
}

if is_running; then
  echo "Viewer already running at http://localhost:$PORT"
else
  echo "Starting diagram viewer on port $PORT..."
  cd "$VIEWER_DIR"
  npx vite --port "$PORT" > "$LOGFILE" 2>&1 &
  echo $! > "$PIDFILE"

  for i in $(seq 1 20); do
    if curl -s -o /dev/null "http://localhost:$PORT" 2>/dev/null; then
      echo "Viewer ready at http://localhost:$PORT"
      break
    fi
    sleep 0.5
  done
fi

if [[ "${1:-}" == "--open" ]]; then
  open "http://localhost:$PORT" 2>/dev/null || xdg-open "http://localhost:$PORT" 2>/dev/null || true
fi
