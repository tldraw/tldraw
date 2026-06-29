#!/bin/bash

# Runs the dev stack behind public cloudflared "quick tunnels" so you can play a
# multiplayer example with a friend over the internet — in the SAME game you see
# on localhost.
#
# It opens two tunnels:
#   - the examples app (port 5420)        -> friends load the app here
#   - your local bemo sync worker (8989)  -> all sync (yours + theirs) goes here
#
# Because everyone syncs through YOUR bemo worker, localhost and the shared link
# are the same room/game, and the versions always match (no public-server drift).
#
# How the pieces connect:
#   - TLDRAW_SHARE_ORIGIN: the "Copy link" button rewrites links onto this origin
#     so a link you copy on localhost is reachable by a friend.
#   - TLDRAW_SHARE_SYNC_HOST: when an example is opened over the tunnel it syncs
#     through this (your bemo tunnel) instead of the public demo server.
#
# Usage: yarn dev-share
# Requires cloudflared (`brew install cloudflared`).

set -euo pipefail

if ! command -v cloudflared >/dev/null 2>&1; then
	echo "cloudflared not found. Install it with: brew install cloudflared"
	exit 1
fi

app_pid="" ; bemo_pid=""
app_log="$(mktemp -t tldraw-share-app)"
bemo_log="$(mktemp -t tldraw-share-bemo)"
cleanup() {
	[ -n "$app_pid" ] && kill "$app_pid" 2>/dev/null || true
	[ -n "$bemo_pid" ] && kill "$bemo_pid" 2>/dev/null || true
	rm -f "$app_log" "$bemo_log" 2>/dev/null || true
}
trap cleanup EXIT INT TERM

# Reads the first https://<...>.trycloudflare.com URL out of a cloudflared log,
# waiting until it appears (the URL is allocated on edge-connect, before the
# local upstream needs to be up).
wait_for_url() {
	local log="$1" pid="$2" url=""
	for _ in $(seq 1 60); do
		url="$(grep -oE 'https://[a-z0-9-]+\.trycloudflare\.com' "$log" | head -1 || true)"
		[ -n "$url" ] && { echo "$url"; return 0; }
		if ! kill -0 "$pid" 2>/dev/null; then return 1; fi
		sleep 1
	done
	return 1
}

echo "Opening public tunnels (app + sync)..."
cloudflared tunnel --url http://localhost:5420 >"$app_log" 2>&1 &
app_pid=$!
cloudflared tunnel --url http://localhost:8989 >"$bemo_log" 2>&1 &
bemo_pid=$!

app_origin="$(wait_for_url "$app_log" "$app_pid")" || { echo "app tunnel failed:"; cat "$app_log"; exit 1; }
bemo_origin="$(wait_for_url "$bemo_log" "$bemo_pid")" || { echo "sync tunnel failed:"; cat "$bemo_log"; exit 1; }

echo ""
echo "  App URL:   $app_origin"
echo "  Sync host: $bemo_origin  (your local bemo worker, version-matched)"
echo ""
echo "  Open a multiplayer example (localhost is fine), click \"Copy link\", and"
echo "  send it. You and your friend will be in the same game."
echo ""

export TLDRAW_SHARE_ORIGIN="$app_origin"
export TLDRAW_SHARE_SYNC_HOST="$bemo_origin"
yarn dev
