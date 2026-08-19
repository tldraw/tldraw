#!/bin/bash
# Integration checks for idle pruning against a local wrangler dev.
# `yarn build` (from apps/mcp-app) must have run first so dist/mcp-app.html exists.
# Usage (from apps/mcp-app):
#   npx wrangler dev --port 8802 --var ADMIN_TOKEN:test-admin-token --var MCP_IS_DEV:true --var IDLE_TTL_MS_OVERRIDE:3000   # in another shell
#   bash scripts/verify-prune.sh
#
# The expiry-schedule section needs IDLE_TTL_MS_OVERRIDE:3000 to fire the alarm inside
# the test's sleep; the re-arm's Math.max(..., now + 60s) floor still pushes the next
# alarm ~60s out, so we only assert the schedule row survived the SDK's row delete, not
# a specific re-armed time.
set -u
BASE=${BASE:-http://localhost:8802}
ADMIN=${ADMIN_TOKEN:-test-admin-token}
HDR=(-H 'Content-Type: application/json' -H 'Accept: application/json, text/event-stream')
INIT='{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-03-26","capabilities":{},"clientInfo":{"name":"verify","version":"1.0.0"}}}'
SAVE='{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"save_checkpoint","arguments":{"checkpointId":"cp-1","shapesJson":"[{\"id\":\"shape:a\",\"type\":\"geo\",\"x\":0,\"y\":0}]"}}}'
fail=0
ok()   { echo "  OK   $1"; }
bad()  { echo "  FAIL $1"; fail=1; }

new_session() {
	curl -s -D - -o /dev/null -X POST "$BASE/mcp" "${HDR[@]}" -d "$INIT" \
		| grep -i '^mcp-session-id:' | tr -d '\r' | cut -d' ' -f2
}
# The DO id for a session comes from the dev-only /admin/do-id helper
# (idFromName("streamable-http:<sid>") is not otherwise reachable over HTTP).
prune() { # $1=json body
	curl -s -X POST "$BASE/admin/prune" -H "Authorization: Bearer $ADMIN" -H 'Content-Type: application/json' -d "$1"
}

echo "== gates =="
[ "$(curl -s -o /dev/null -w '%{http_code}' -X POST "$BASE/admin/prune" -d '{}')" = "401" ] && ok "401 without token" || bad "401 without token"
[ "$(curl -s -o /dev/null -w '%{http_code}' "$BASE/admin/prune" -H "Authorization: Bearer $ADMIN")" = "405" ] && ok "405 on GET" || bad "405 on GET"
[ "$(prune '{"ids":["zzz"],"maxIdleMs":0,"dryRun":true}' | grep -c '"error"')" = "1" ] && ok "malformed id -> {id,error}" || bad "malformed id -> {id,error}"
[ "$(curl -s -o /dev/null -w '%{http_code}' -X POST "$BASE/admin/prune" -H "Authorization: Bearer $ADMIN" -H 'Content-Type: application/json' -d '{"ids":[],"maxIdleMs":"x"}')" = "400" ] && ok "400 on bad body" || bad "400 on bad body"

echo "== session lifecycle =="
SID=$(new_session); [ -n "$SID" ] && ok "session minted ${SID:0:12}..." || bad "session minted"
curl -s -o /dev/null -X POST "$BASE/mcp" "${HDR[@]}" -H "mcp-session-id: $SID" -d "$SAVE"
DOID=$(curl -s "$BASE/admin/do-id?session=$SID" -H "Authorization: Bearer $ADMIN")
if [[ ! $DOID =~ ^[0-9a-f]{64}$ ]]; then echo "  (could not resolve DO id: '$DOID' — start wrangler dev with --var MCP_IS_DEV:true; skipping id-based checks)"; else
	R=$(prune "{\"ids\":[\"$DOID\"],\"maxIdleMs\":604800000,\"dryRun\":true}")
	echo "$R" | grep -q '"action":"kept"' && ok "dry-run at 7d -> kept" || bad "dry-run at 7d -> kept: $R"
	R=$(prune "{\"ids\":[\"$DOID\"],\"maxIdleMs\":0,\"dryRun\":true}")
	echo "$R" | grep -q '"action":"would-destroy"' && ok "dry-run at 0 -> would-destroy" || bad "dry-run at 0 -> would-destroy: $R"
	echo "$R" | grep -q '"checkpointCount":1' && ok "checkpointCount reflects the save" || bad "checkpointCount: $R"
	R=$(prune "{\"ids\":[\"$DOID\"],\"maxIdleMs\":0,\"dryRun\":false}")
	echo "$R" | grep -q '"action":"destroy-scheduled"' && ok "prune at 0 -> destroy-scheduled" || bad "prune at 0: $R"
	R=$(prune "{\"ids\":[\"$DOID\"],\"maxIdleMs\":0,\"dryRun\":false}")
	echo "$R" | grep -q 'already condemned\|destroy-scheduled' && ok "second prune is idempotent/harmless" || bad "second prune: $R"
	sleep 3
	CODE=$(curl -s -o /dev/null -w '%{http_code}' -X POST "$BASE/mcp" "${HDR[@]}" -H "mcp-session-id: $SID" -d '{"jsonrpc":"2.0","id":3,"method":"tools/list","params":{}}')
	[ "$CODE" = "404" ] && ok "session gone after condemn (404)" || bad "session after condemn: $CODE"
fi

echo "== expiry schedule =="
schedule_id_count() { curl -s "$BASE/admin/schedules?session=$1" -H "Authorization: Bearer $ADMIN" | grep -o '"id"' | wc -l | tr -d ' '; }
schedule_id() { curl -s "$BASE/admin/schedules?session=$1" -H "Authorization: Bearer $ADMIN" | grep -o '"id":"[^"]*"' | head -1; }

SID2=$(new_session); [ -n "$SID2" ] && ok "session minted ${SID2:0:12}..." || bad "session minted"
[ "$(schedule_id_count "$SID2")" = "1" ] && ok "exactly one expiry schedule after init" || bad "expiry schedule count after init"
curl -s -o /dev/null -X POST "$BASE/mcp" "${HDR[@]}" -H "mcp-session-id: $SID2" -d "$SAVE"
curl -s -o /dev/null -X POST "$BASE/mcp" "${HDR[@]}" -H "mcp-session-id: $SID2" -d "$SAVE"
[ "$(schedule_id_count "$SID2")" = "1" ] && ok "still exactly one expiry schedule after two saves" || bad "expiry schedule count after saves"

# Needs the dev server started with --var IDLE_TTL_MS_OVERRIDE:3000: the 3s TTL alarm
# fires inside this sleep, and the row surviving with a different id is what proves
# expireIfIdle's re-arm ran (the SDK deletes the executing row on every fire).
SID3=$(new_session); [ -n "$SID3" ] && ok "session minted ${SID3:0:12}..." || bad "session minted"
curl -s -o /dev/null -X POST "$BASE/mcp" "${HDR[@]}" -H "mcp-session-id: $SID3" -d "$SAVE"
FIRST_SCHEDULE=$(schedule_id "$SID3")
sleep 5
[ "$(schedule_id_count "$SID3")" = "1" ] && ok "still exactly one expiry schedule after alarm fire" || bad "expiry schedule count after alarm fire"
SECOND_SCHEDULE=$(schedule_id "$SID3")
[ -n "$SECOND_SCHEDULE" ] && [ "$SECOND_SCHEDULE" != "$FIRST_SCHEDULE" ] && ok "expiry re-armed with a new schedule row" || bad "expiry re-arm: first=$FIRST_SCHEDULE second=$SECOND_SCHEDULE"

exit $fail
