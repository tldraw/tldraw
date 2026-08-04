#!/usr/bin/env bash
# Delete orphaned per-PR advanced cert packs (pr-NNNN-* hostnames) for CLOSED PRs only.
# Usage: CLOUDFLARE_API_TOKEN=xxx ./ssl-cleanup.sh <zone_name> [--dry-run|--delete]
# Default is --dry-run. Needs "SSL and Certificates: Write" + gh CLI authed for tldraw/tldraw.
set -euo pipefail

ZONE_NAME="${1:?usage: ssl-cleanup.sh <zone_name> [--dry-run|--delete]}"
MODE="${2:---dry-run}"
: "${CLOUDFLARE_API_TOKEN:?set CLOUDFLARE_API_TOKEN}"

[[ "$MODE" == "--dry-run" || "$MODE" == "--delete" ]] \
	|| { echo "unknown mode: ${MODE} (use --dry-run or --delete)" >&2; exit 1; }

API="https://api.cloudflare.com/client/v4"
auth=(-H "Authorization: Bearer ${CLOUDFLARE_API_TOKEN}")

ZONE_ID="$(curl -sfS "${API}/zones?name=${ZONE_NAME}" "${auth[@]}" | jq -re '.result[0].id')" \
	|| { echo "zone not found: ${ZONE_NAME}" >&2; exit 1; }

# pr number -> state, cached (several packs per PR: -demo, -images, ...)
declare -A pr_state_cache
pr_closed() {
	local pr="$1"
	if [[ -z "${pr_state_cache[$pr]:-}" ]]; then
		# 404 (deleted PR) counts as closed
		pr_state_cache[$pr]="$(gh api "repos/tldraw/tldraw/pulls/${pr}" --jq .state 2>/dev/null || echo closed)"
	fi
	[[ "${pr_state_cache[$pr]}" == "closed" ]]
}

deleted=0 kept=0
while IFS=$'\t' read -r id pr hosts; do
	if pr_closed "$pr"; then
		if [[ "$MODE" == "--delete" ]]; then
			echo "deleting (PR #${pr} closed)  ${id}  ${hosts}"
			curl -sfS -X DELETE "${API}/zones/${ZONE_ID}/ssl/certificate_packs/${id}" "${auth[@]}" >/dev/null
		else
			echo "would delete (PR #${pr} closed)  ${id}  ${hosts}"
		fi
		((deleted++)) || true
	else
		echo "keeping (PR #${pr} open)  ${hosts}"
		((kept++)) || true
	fi
done < <(
	# all pages of advanced packs where some host matches pr-<digits>-; emit id, pr number, hosts
	page=1
	while :; do
		resp="$(curl -sfS "${API}/zones/${ZONE_ID}/ssl/certificate_packs?status=all&per_page=100&page=${page}" "${auth[@]}")"
		jq -r '.result[]
			| select(.type == "advanced")
			| select(any(.hosts[]; test("^pr-[0-9]+-")))
			| [.id, ([.hosts[] | capture("^pr-(?<n>[0-9]+)-").n] | first), (.hosts | join(","))]
			| @tsv' <<<"$resp"
		total_pages="$(jq -r '.result_info.total_pages // 1' <<<"$resp")"
		(( page >= total_pages )) && break
		((page++))
	done
)

echo "---"
echo "${deleted} closed-PR packs $([[ "$MODE" == "--delete" ]] && echo deleted || echo 'to delete'), ${kept} open-PR packs kept"
[[ "$MODE" == "--delete" ]] || echo "(dry run — rerun with --delete to remove)"
