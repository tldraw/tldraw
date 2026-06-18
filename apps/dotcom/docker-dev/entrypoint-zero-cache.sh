#!/usr/bin/env bash
# SPIKE: zero-cache container entrypoint.
#
# Mirrors the host orchestrator (apps/dotcom/zero-cache/dev.ts) but WITHOUT the
# Docker-from-Docker bring-up, port reconciliation, and process-tree reaping that
# the host version needs — here Compose owns postgres and the container lifecycle.
set -euo pipefail

cd /repo/apps/dotcom/zero-cache

PG="${PGHOST:-postgres}"

echo "[zero-cache] waiting for postgres at ${PG}:5432 ..."
# bash /dev/tcp probe — no extra packages needed in the slim image.
until (echo >"/dev/tcp/${PG}/5432") 2>/dev/null; do
	sleep 1
done
echo "[zero-cache] postgres is reachable."

# Bundle the Zero schema (tlaSchema.ts -> .schema.js), then keep it fresh in the
# background so schema edits trigger a zero-cache restart (via nodemon below).
echo "[zero-cache] bundling schema ..."
yarn bundle-schema
yarn bundle-schema:watch &

# Apply SQL migrations. --signal-success runs them to completion and THEN opens a
# readiness server on :7654. The migrations create the `zero_data` publication, so
# zero-cache MUST NOT start until they finish — otherwise the change-streamer boots
# first and dies with "Unknown or invalid publications. Found: []". The host
# orchestrator (dev.ts) waits on :7654 for exactly this reason; we mirror it.
echo "[zero-cache] running migrations ..."
yarn migrate --signal-success &

echo "[zero-cache] waiting for migrations to finish (port 7654) ..."
until (echo >'/dev/tcp/127.0.0.1/7654') 2>/dev/null; do
	sleep 1
done
echo "[zero-cache] migrations complete."

# Start zero-cache, restarting whenever the bundled schema changes. This is the
# exact invocation the host orchestrator uses.
echo "[zero-cache] starting zero-cache-dev ..."
exec yarn exec nodemon \
	--watch ./.schema.js \
	--exec zero-cache-dev \
	--signal SIGINT
