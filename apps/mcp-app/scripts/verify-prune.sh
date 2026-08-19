#!/bin/bash
# Integration checks for idle pruning against a local wrangler dev.
# Usage (from apps/mcp-app):
#   npx wrangler dev --port 8802 --var ADMIN_TOKEN:test-admin-token   # in another shell
#   bash scripts/verify-prune.sh
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
if [ -z "$DOID" ]; then echo "  (no /admin/do-id helper; skipping id-based checks — see Task 7 step 2)"; else
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
exit $fail
