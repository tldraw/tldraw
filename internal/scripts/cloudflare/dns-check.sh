#!/usr/bin/env bash
# Check DNS records in a zone: what's there already, and which pr-NNNN-* records are orphaned.
# Read-only. Usage: CLOUDFLARE_API_TOKEN=xxx ./dns-check.sh <zone_name>
# Token needs "Zone: Read" + "DNS: Read"; gh CLI must be authed for tldraw/tldraw.
set -euo pipefail

ZONE_NAME="${1:?usage: dns-check.sh <zone_name>}"
: "${CLOUDFLARE_API_TOKEN:?set CLOUDFLARE_API_TOKEN}"

gh auth status >/dev/null 2>&1 || { echo "gh is not authenticated (run: gh auth login)" >&2; exit 1; }

API="https://api.cloudflare.com/client/v4"
auth=(-H "Authorization: Bearer ${CLOUDFLARE_API_TOKEN}")

ZONE_ID="$(curl -sfS "${API}/zones?name=${ZONE_NAME}" "${auth[@]}" | jq -re '.result[0].id')" \
	|| { echo "zone not found: ${ZONE_NAME}" >&2; exit 1; }

# pr number -> state, cached. Only an HTTP 404 (deleted PR) counts as closed;
# any other gh failure aborts so broken auth can't mark everything ORPHAN.
# Sets PR_STATE rather than echoing: a $(...) call would run in a subshell,
# losing both the cache writes and the abort-on-failure.
declare -A pr_state_cache
PR_STATE=""
pr_state() {
	local pr="$1" out
	if [[ -z "${pr_state_cache[$pr]:-}" ]]; then
		if out="$(gh api "repos/tldraw/tldraw/pulls/${pr}" --jq .state 2>&1)"; then
			pr_state_cache[$pr]="$out"
		elif [[ "$out" == *"HTTP 404"* ]]; then
			pr_state_cache[$pr]="closed"
		else
			echo "gh api failed for PR #${pr}: ${out}" >&2
			exit 1
		fi
	fi
	PR_STATE="${pr_state_cache[$pr]}"
}

# Fetch all pages up front, checking each response, so a mid-pagination failure
# aborts instead of reporting on a silently truncated record list.
records_file="$(mktemp)"
trap 'rm -f "$records_file"' EXIT
page=1
while :; do
	resp="$(curl -sfS "${API}/zones/${ZONE_ID}/dns_records?per_page=100&page=${page}" "${auth[@]}")" \
		|| { echo "failed to fetch DNS records page ${page}" >&2; exit 1; }
	jq -e '.success' <<<"$resp" >/dev/null \
		|| { echo "API error on page ${page}: $(jq -c '.errors' <<<"$resp")" >&2; exit 1; }
	jq -r '.result[] | [.type, .name, ((.content // "-") | tostring | .[0:50]), (.proxied|tostring)] | @tsv' \
		<<<"$resp" >> "$records_file"
	total_pages="$(jq -r '.result_info.total_pages // 1' <<<"$resp")"
	(( page >= total_pages )) && break
	((page++))
done

echo "=== non-PR records (existing infra) ==="
# match on the name field only, so a record whose *content* mentions pr-N- doesn't leak between sections
awk -F'\t' '$2 !~ /^pr-[0-9]+-/' "$records_file" | sort -k2 | column -t -s $'\t'

echo
echo "=== PR preview records ==="
pr_lines=""
while IFS=$'\t' read -r type name content proxied; do
	pr="${name#pr-}"
	pr="${pr%%-*}"
	pr_state "$pr"
	if [[ "$PR_STATE" == "closed" ]]; then
		pr_lines+="ORPHAN (PR #${pr} closed)"$'\t'"${type}"$'\t'"${name}"$'\t'"${content}"$'\t'"proxied=${proxied}"$'\n'
	else
		pr_lines+="ok (PR #${pr} open)"$'\t'"${type}"$'\t'"${name}"$'\t'"${content}"$'\t'"proxied=${proxied}"$'\n'
	fi
done < <(awk -F'\t' '$2 ~ /^pr-[0-9]+-/' "$records_file")
if [[ -n "$pr_lines" ]]; then
	printf '%s' "$pr_lines" | column -t -s $'\t'
else
	echo "(none)"
fi

echo
echo "=== summary ==="
echo "total records: $(grep -c . "$records_file")"
echo "pr records: ok=$(grep -c '^ok' <<<"$pr_lines" || true) orphaned=$(grep -c '^ORPHAN' <<<"$pr_lines" || true)"
if awk -F'\t' -v w="*.${ZONE_NAME}" '$2 == w { found=1 } END { exit !found }' "$records_file"; then
	echo "wildcard *.${ZONE_NAME}: EXISTS"
else
	echo "wildcard *.${ZONE_NAME}: not present"
fi
