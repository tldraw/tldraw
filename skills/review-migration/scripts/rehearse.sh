#!/usr/bin/env bash
# Rehearse a migration's lock behavior against a scratch database.
#
# Builds a database from the migration chain up to (not including) the migration under review,
# runs the migration inside a transaction with a pause injected after a chosen statement, optionally
# races a concurrent transaction against it during the pause, and prints the locks the migration
# holds at that point plus the outcome of both sides. The migration is rolled back and the scratch
# database dropped. Requires the local dev stack's Postgres (or --url) and either psql or docker.
#
# Usage:
#   rehearse.sh <NNN> [--file draft.sql] [--seed file.sql] [--concurrent file.sql] [--pause-after <regex>] [--url <url>]
#
# --file runs that file in place of the checked-in NNN, so a draft or a variant can be rehearsed
# against the same chain.
set -euo pipefail

here=$(cd "$(dirname "$0")" && pwd)
repo=$(cd "$here/../../.." && pwd)
migrations="$repo/apps/dotcom/zero-cache/migrations"

num=""; file=""; seed=""; concurrent=""; pause_after=""; url="postgresql://user:password@localhost:6543/postgres"
while [ $# -gt 0 ]; do
	case "$1" in
		--file) file=$2; shift 2 ;;
		--seed) seed=$2; shift 2 ;;
		--concurrent) concurrent=$2; shift 2 ;;
		--pause-after) pause_after=$2; shift 2 ;;
		--url) url=$2; shift 2 ;;
		-h|--help) sed -n '2,15p' "$0"; exit 0 ;;
		*) num=$1; shift ;;
	esac
done
[ -n "$num" ] || { echo "usage: rehearse.sh <NNN> [--file f] [--seed f] [--concurrent f] [--pause-after re] [--url u]" >&2; exit 2; }

# The chain stops at the first checked-in file numbered >= NNN, so NNN can be a number not yet taken.
stop_at=$(ls "$migrations"/*.sql | sort | awk -v n="$num" '{ split($0, p, "/"); if (substr(p[length(p)], 1, 3) >= n) { print; exit } }')
target=${file:-$stop_at}
[ -n "$target" ] && [ -f "$target" ] || { echo "no migration ${num}_*.sql in $migrations and no --file given" >&2; exit 2; }

# postgresql://user:pass@host:port/db
rest=${url#*://}; auth=${rest%%@*}; hostdb=${rest#*@}
pg_user=${auth%%:*}; pg_pass=${auth#*:}; pg_host=${hostdb%%/*}; pg_port=${pg_host#*:}; pg_host=${pg_host%%:*}

# psql if installed, else the dev stack's container, which listens on its own 5432 rather than the
# host port in the URL.
if command -v psql >/dev/null 2>&1; then
	run_sql() { local d=$1; shift; PGPASSWORD=$pg_pass psql -X -q -v ON_ERROR_STOP=1 -h "$pg_host" -p "$pg_port" -U "$pg_user" -d "$d" "$@"; }
else
	container=${REHEARSE_PG_CONTAINER:-tldraw_dotcom_dev-zstart_postgres-1}
	run_sql() { local d=$1; shift; docker exec -i -e PGPASSWORD="$pg_pass" "$container" psql -X -q -v ON_ERROR_STOP=1 -U "$pg_user" -d "$d" "$@"; }
fi

db="rehearse_${num}_$$"
pg_admin() { run_sql postgres "$@"; }
pg_db() { run_sql "$db" "$@"; }

cleanup() {
	pg_admin -c "DROP DATABASE IF EXISTS $db" >/dev/null 2>&1 || true
	rm -f "$work"/*.out
	rmdir "$work" 2>/dev/null || true
}
work=$(mktemp -d)
trap cleanup EXIT

echo "== scratch database $db"
pg_admin -c "CREATE DATABASE $db" >/dev/null

echo "== applying chain before $(basename "${stop_at:-$num}")"
for f in $(ls "$migrations"/*.sql | sort); do
	[ "$f" = "$stop_at" ] && break
	if ! pg_db < "$f" >/dev/null 2>"$work/err.out"; then
		echo "chain failed at $(basename "$f"):" >&2; cat "$work/err.out" >&2; exit 1
	fi
done

if [ -n "$seed" ]; then
	echo "== seeding from $seed"
	pg_db < "$seed" >/dev/null
fi

# Find the statement to pause after: the first match of --pause-after, else the first LOCK TABLE,
# else the first ALTER/DROP. Matching is by line, so the regex should match the statement's first line.
if [ -z "$pause_after" ]; then
	if grep -qE '^LOCK TABLE' "$target"; then pause_after='^LOCK TABLE'; else pause_after='^(ALTER|DROP) '; fi
fi
pause_line=$(grep -nE "$pause_after" "$target" | head -1 | cut -d: -f1)
[ -n "$pause_line" ] || { echo "--pause-after '$pause_after' matched nothing in $(basename "$target")" >&2; exit 2; }
# Statement end: first line at or after the match that ends with a semicolon.
end_line=$(awk -v s="$pause_line" 'NR>=s && /;[[:space:]]*$/ {print NR; exit}' "$target")
echo "== pausing 3s after line $pause_line-$end_line: $(sed -n "${pause_line}p" "$target")"

{
	echo "BEGIN;"
	echo "SET LOCAL lock_timeout = '10s';"
	echo "SELECT pg_backend_pid() AS migration_pid \\gset"
	echo "\\echo migration_pid=:migration_pid"
	sed -n "1,${end_line}p" "$target"
	echo "SELECT c.relname, l.mode, l.granted FROM pg_locks l JOIN pg_class c ON c.oid = l.relation WHERE l.pid = pg_backend_pid() AND l.locktype = 'relation' AND c.relnamespace = 'public'::regnamespace AND l.mode <> 'AccessShareLock' ORDER BY c.relname, l.mode;"
	echo "SELECT pg_sleep(3);"
	sed -n "$((end_line + 1)),\$p" "$target"
	echo "SELECT 'migration: reached end' AS outcome;"
	echo "ROLLBACK;"
} > "$work/migration.sql"

echo "== running migration (rolled back at the end)"
( pg_db < "$work/migration.sql" > "$work/migration.out" 2>&1 || true ) &
mig=$!

if [ -n "$concurrent" ]; then
	sleep 0.7
	echo "== starting concurrent transaction from $concurrent"
	( pg_db < "$concurrent" > "$work/concurrent.out" 2>&1 || true ) &
	con=$!
	wait $con
fi
wait $mig

echo
echo "== locks held by the migration during the pause (excluding ACCESS SHARE)"
sed -n '/relname/,/^([0-9]* rows)/p' "$work/migration.out"
echo
echo "== migration outcome"
if grep -q "reached end" "$work/migration.out"; then echo "ok: reached end"; else grep -iE "error|deadlock|timeout" "$work/migration.out" || tail -5 "$work/migration.out"; fi
if [ -n "$concurrent" ]; then
	echo
	echo "== concurrent outcome"
	if grep -qiE "error|deadlock" "$work/concurrent.out"; then grep -iE "error|deadlock|detail" "$work/concurrent.out"; else echo "ok:"; grep -vE '^\s*$|^-+$|rows?\)' "$work/concurrent.out" | tail -3; fi
fi
