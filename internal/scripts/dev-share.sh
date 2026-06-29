#!/bin/bash

# Runs the normal dev stack behind a public cloudflared "quick tunnel" so you can
# share a multiplayer example with a friend over the internet.
#
# How it works:
#   1. Opens a cloudflared quick tunnel to the examples app (port 5420) and grabs
#      its public https://<...>.trycloudflare.com URL.
#   2. Starts `yarn dev` with TLDRAW_SHARE_ORIGIN set to that URL. The examples
#      app's "Copy link" button rewrites links onto that origin, so the link you
#      copy is shareable even while you browse on localhost.
#   3. The multiplayer examples auto-sync through tldraw's public demo server when
#      opened over the tunnel, so the friend's side connects with no extra params.
#
# Usage: yarn dev-share
# Requires cloudflared (`brew install cloudflared`).

set -euo pipefail

if ! command -v cloudflared >/dev/null 2>&1; then
	echo "cloudflared not found. Install it with: brew install cloudflared"
	exit 1
fi

tunnel_pid=""
tunnel_log="$(mktemp -t tldraw-dev-share)"
cleanup() {
	[ -n "$tunnel_pid" ] && kill "$tunnel_pid" 2>/dev/null || true
	rm -f "$tunnel_log" 2>/dev/null || true
}
trap cleanup EXIT INT TERM

# A quick tunnel allocates its public URL as soon as it connects to Cloudflare's
# edge — it doesn't wait for the local upstream — so we can start it first and
# read the URL before launching the dev stack.
echo "Opening public tunnel..."
cloudflared tunnel --url http://localhost:5420 >"$tunnel_log" 2>&1 &
tunnel_pid=$!

share_origin=""
for _ in $(seq 1 60); do
	share_origin="$(grep -oE 'https://[a-z0-9-]+\.trycloudflare\.com' "$tunnel_log" | head -1 || true)"
	[ -n "$share_origin" ] && break
	if ! kill -0 "$tunnel_pid" 2>/dev/null; then
		echo "cloudflared exited before producing a URL. Log:"
		cat "$tunnel_log"
		exit 1
	fi
	sleep 1
done

if [ -z "$share_origin" ]; then
	echo "Timed out waiting for the tunnel URL. Log:"
	cat "$tunnel_log"
	exit 1
fi

echo ""
echo "  Public URL:  $share_origin"
echo "  Share a multiplayer example by opening it (on localhost is fine) and"
echo "  clicking \"Copy link\" — the copied link will use the public URL above."
echo ""

export TLDRAW_SHARE_ORIGIN="$share_origin"
yarn dev
