#!/usr/bin/env bash
# Starts a named cloudflared tunnel (stable per-user hostname) + wrangler dev,
# wiring the stable tunnel hostname into the worker as WORKER_ORIGIN.
#
# Unlike a quick tunnel (random *.trycloudflare.com URL each run), the named
# tunnel always serves at the same hostname, so you register the URL in
# ChatGPT / other hosted MCP clients once and never touch it again.
#
# Usage: ./dev-tunnel.sh
# Env overrides:
#   MCP_TUNNEL_USER  - slug used in the tunnel name/hostname (default: whoami)
#   MCP_TUNNEL_ZONE  - DNS zone for the hostname
#   PORT             - local worker port (default: 8787)
set -euo pipefail

PORT="${PORT:-8787}"
USER_SLUG="${MCP_TUNNEL_USER:-$(whoami)}"
ZONE="${MCP_TUNNEL_ZONE:-tldraw.xyz}"
TUNNEL_NAME="${USER_SLUG}-mcp-app-dev"
HOSTNAME="${TUNNEL_NAME}.${ZONE}"
TUNNEL_URL="https://${HOSTNAME}"
CRED_FILE="$HOME/.cloudflared/${TUNNEL_NAME}.json"

# 0. Require cloudflared and a one-time login
if ! command -v cloudflared >/dev/null 2>&1; then
  echo "ERROR: cloudflared is not installed."
  echo "See https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/"
  exit 1
fi

if [ ! -f "$HOME/.cloudflared/cert.pem" ]; then
  echo "You are not logged in to cloudflared. Run this once, then re-run this script:"
  echo "  cloudflared tunnel login"
  echo "(choose the ${ZONE} zone when prompted)"
  exit 1
fi

# 1. Ensure the tunnel exists and we have local credentials for it.
#    If the tunnel already exists in the account but the local credentials file
#    is gone (e.g. you wiped ~/.cloudflared or switched machines), re-download
#    it with `tunnel token` instead of failing in `tunnel run`.
if cloudflared tunnel info "$TUNNEL_NAME" >/dev/null 2>&1; then
  if [ ! -f "$CRED_FILE" ]; then
    echo "Restoring credentials for existing tunnel ${TUNNEL_NAME}..."
    cloudflared tunnel token --cred-file "$CRED_FILE" "$TUNNEL_NAME"
  fi
else
  echo "Creating tunnel ${TUNNEL_NAME}..."
  cloudflared tunnel create --credentials-file "$CRED_FILE" "$TUNNEL_NAME"
fi

# 2. Make sure the stable hostname routes to this tunnel. --overwrite-dns makes
#    the specific record win over any *.${ZONE} wildcard and re-points it if the
#    tunnel was ever recreated.
echo "Ensuring DNS route ${HOSTNAME} -> ${TUNNEL_NAME}..."
if ! ROUTE_OUT=$(cloudflared tunnel route dns --overwrite-dns "$TUNNEL_NAME" "$HOSTNAME" 2>&1); then
  echo "ERROR: failed to route ${HOSTNAME} to ${TUNNEL_NAME}:"
  echo "$ROUTE_OUT"
  echo "Make sure ${ZONE} is a Cloudflare-hosted zone in your account and you ran 'cloudflared tunnel login'."
  exit 1
fi

# Build widget first
echo "Building widget..."
yarn build:widget

# 3. Start cloudflared in the background, forwarding the tunnel to the local worker
cloudflared tunnel --url "http://localhost:$PORT" run --cred-file "$CRED_FILE" "$TUNNEL_NAME" &
CF_PID=$!

cleanup() {
  echo "Stopping cloudflared (pid $CF_PID)..."
  kill "$CF_PID" 2>/dev/null || true
}
trap cleanup EXIT

echo ""
echo "==================================="
echo "Stable tunnel URL: $TUNNEL_URL"
echo "==================================="
echo ""
echo "Register this once in ChatGPT / claude_desktop_config.json:"
echo "  \"args\": [\"-y\", \"mcp-remote\", \"$TUNNEL_URL/mcp\"]"
echo ""

# 4. Start wrangler with the stable tunnel URL as WORKER_ORIGIN in dev mode.
#    Runs in the foreground; the EXIT trap stops cloudflared when wrangler exits.
wrangler dev --port "$PORT" --var "WORKER_ORIGIN:$TUNNEL_URL" --var "MCP_IS_DEV:true"
