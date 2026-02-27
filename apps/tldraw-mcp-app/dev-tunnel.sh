#!/usr/bin/env bash
# Starts a cloudflared tunnel + wrangler dev with the tunnel URL as WORKER_ORIGIN.
# Usage: ./dev-tunnel.sh
set -euo pipefail

PORT="${PORT:-8787}"
LOGFILE=$(mktemp)

# Build widget first
echo "Building widget..."
yarn build:widget

# Start cloudflared in background, capture the tunnel URL from stderr
cloudflared tunnel --url "http://localhost:$PORT" 2>"$LOGFILE" &
CF_PID=$!

cleanup() {
  echo "Stopping cloudflared (pid $CF_PID)..."
  kill "$CF_PID" 2>/dev/null || true
  rm -f "$LOGFILE"
}
trap cleanup EXIT

# Wait for cloudflared to print the tunnel URL
echo "Waiting for tunnel URL..."
TUNNEL_URL=""
for i in $(seq 1 30); do
  TUNNEL_URL=$(grep -o 'https://[a-z0-9-]*\.trycloudflare\.com' "$LOGFILE" | head -1 || true)
  if [ -n "$TUNNEL_URL" ]; then
    break
  fi
  sleep 1
done

if [ -z "$TUNNEL_URL" ]; then
  echo "ERROR: Failed to get tunnel URL after 30s. cloudflared log:"
  cat "$LOGFILE"
  exit 1
fi

echo ""
echo "==================================="
echo "Tunnel URL: $TUNNEL_URL"
echo "==================================="
echo ""
echo "Update claude_desktop_config.json to use:"
echo "  \"args\": [\"-y\", \"mcp-remote\", \"$TUNNEL_URL/mcp\"]"
echo ""

# Start wrangler with the tunnel URL as WORKER_ORIGIN
exec wrangler dev --port "$PORT" --var "WORKER_ORIGIN:$TUNNEL_URL"
