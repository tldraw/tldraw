#!/usr/bin/env bash
# Check DNS records in a zone: what's there already, and which pr-NNNN-* records are orphaned.
# Read-only. Usage: CLOUDFLARE_API_TOKEN=xxx ./dns-check.sh <zone_name>
# Needs "DNS: Read" + gh CLI authed for tldraw/tldraw.
set -euo pipefail

ZONE_NAME="${1:?usage: dns-check.sh <zone_name>}"
: "${CLOUDFLARE_API_TOKEN:?set CLOUDFLARE_API_TOKEN}"

API="https://api.cloudflare.com/client/v4"
auth=(-H "Authorization: Bearer ${CLOUDFLARE_API_TOKEN}")

ZONE_ID="$(curl -sfS "${API}/zones?name=${ZONE_NAME}" "${auth[@]}" | jq -re '.result[0].id')" \
	|| { echo "zone not found: ${ZONE_NAME}" >&2; exit 1; }

declare -A pr_state_cache
pr_state() {
	local pr="$1"
	if [[ -z "${pr_state_cache[$pr]:-}" ]]; then
		pr_state_cache[$pr]="$(gh api "repos/tldraw/tldraw/pulls/${pr}" --jq .state 2>/dev/null || echo closed)"
	fi
	echo "${pr_state_cache[$pr]}"
}

records="$(
	page=1
	while :; do
		resp="$(curl -sfS "${API}/zones/${ZONE_ID}/dns_records?per_page=100&page=${page}" "${auth[@]}")"
		jq -r '.result[] | [.type, .name, ((.content // "-") | tostring | .[0:50]), (.proxied|tostring)] | @tsv' <<<"$resp"
		total_pages="$(jq -r '.result_info.total_pages // 1' <<<"$resp")"
		(( page >= total_pages )) && break
		((page++))
	done
)"

echo "=== non-PR records (existing infra) ==="
grep -vE $'\t''pr-[0-9]+-' <<<"$records" | sort -k2 | column -t -s $'\t' || echo "(none)"

echo
echo "=== PR preview records ==="
pr_lines=""
while IFS=$'\t' read -r type name content proxied; do
	pr="$(sed -E 's/^pr-([0-9]+)-.*/\1/' <<<"$name")"
	if [[ "$(pr_state "$pr")" == "closed" ]]; then
		pr_lines+="ORPHAN (PR #${pr} closed)"$'\t'"${type}"$'\t'"${name}"$'\t'"${content}"$'\t'"proxied=${proxied}"$'\n'
	else
		pr_lines+="ok (PR #${pr} open)"$'\t'"${type}"$'\t'"${name}"$'\t'"${content}"$'\t'"proxied=${proxied}"$'\n'
	fi
done < <(grep -E $'\t''pr-[0-9]+-' <<<"$records" || true)
[[ -n "$pr_lines" ]] && printf '%s' "$pr_lines" | column -t -s $'\t' || echo "(none)"

echo
echo "=== summary ==="
echo "total records: $(grep -c . <<<"$records")"
echo "pr records: ok=$(grep -c '^ok' <<<"$pr_lines" || true) orphaned=$(grep -c '^ORPHAN' <<<"$pr_lines" || true)"
if grep -qE $'\t''\*\.'"${ZONE_NAME//./\\.}"$'\t' <<<"$records"; then
	echo "wildcard *.${ZONE_NAME}: EXISTS"
else
	echo "wildcard *.${ZONE_NAME}: not present"
fi
