#!/usr/bin/env bash
# Delete orphaned per-PR advanced cert packs (pr-NNNN-* hostnames) for CLOSED PRs only.
# Usage: CLOUDFLARE_API_TOKEN=xxx ./ssl-cleanup.sh <zone_name> [--dry-run|--delete]
# Default is --dry-run. Token needs "Zone: Read" + "SSL and Certificates: Edit";
# gh CLI must be authed for tldraw/tldraw.
set -euo pipefail

ZONE_NAME="${1:?usage: ssl-cleanup.sh <zone_name> [--dry-run|--delete]}"
MODE="${2:---dry-run}"
: "${CLOUDFLARE_API_TOKEN:?set CLOUDFLARE_API_TOKEN}"

[[ "$MODE" == "--dry-run" || "$MODE" == "--delete" ]] \
	|| { echo "unknown mode: ${MODE} (use --dry-run or --delete)" >&2; exit 1; }

gh auth status >/dev/null 2>&1 || { echo "gh is not authenticated (run: gh auth login)" >&2; exit 1; }

API="https://api.cloudflare.com/client/v4"
auth=(-H "Authorization: Bearer ${CLOUDFLARE_API_TOKEN}")

ZONE_ID="$(curl -sfS "${API}/zones?name=${ZONE_NAME}" "${auth[@]}" | jq -re '.result[0].id')" \
	|| { echo "zone not found: ${ZONE_NAME}" >&2; exit 1; }

# pr number -> state, cached (several packs per PR: -demo, -images, ...).
# Only an HTTP 404 (deleted PR) counts as closed; any other gh failure aborts
# the run so a broken token can't authorize deleting everything.
declare -A pr_state_cache
pr_closed() {
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
	[[ "${pr_state_cache[$pr]}" == "closed" ]]
}

# Fetch all pages up front, checking each response, so a mid-pagination failure
# aborts the run instead of silently truncating the pack list.
packs_file="$(mktemp)"
trap 'rm -f "$packs_file"' EXIT
page=1
while :; do
	resp="$(curl -sfS "${API}/zones/${ZONE_ID}/ssl/certificate_packs?status=all&per_page=100&page=${page}" "${auth[@]}")" \
		|| { echo "failed to fetch certificate packs page ${page}" >&2; exit 1; }
	jq -e '.success' <<<"$resp" >/dev/null \
		|| { echo "API error on page ${page}: $(jq -c '.errors' <<<"$resp")" >&2; exit 1; }
	jq -r '.result[]
		| select(.type == "advanced")
		| select(any(.hosts[]; test("^pr-[0-9]+-")))
		| [.id, ([.hosts[] | capture("^pr-(?<n>[0-9]+)-").n] | first), (.hosts | join(","))]
		| @tsv' <<<"$resp" >> "$packs_file"
	total_pages="$(jq -r '.result_info.total_pages // 1' <<<"$resp")"
	(( page >= total_pages )) && break
	((page++))
done

deleted=0 kept=0 failed=0
while IFS=$'\t' read -r id pr hosts; do
	if pr_closed "$pr"; then
		if [[ "$MODE" == "--delete" ]]; then
			if curl -sfS -X DELETE "${API}/zones/${ZONE_ID}/ssl/certificate_packs/${id}" "${auth[@]}" >/dev/null; then
				echo "deleted (PR #${pr} closed)  ${id}  ${hosts}"
				((deleted++)) || true
			else
				echo "FAILED to delete ${id}  ${hosts}" >&2
				((failed++)) || true
			fi
		else
			echo "would delete (PR #${pr} closed)  ${id}  ${hosts}"
			((deleted++)) || true
		fi
	else
		echo "keeping (PR #${pr} open)  ${hosts}"
		((kept++)) || true
	fi
done < "$packs_file"

echo "---"
echo "${deleted} closed-PR packs $([[ "$MODE" == "--delete" ]] && echo deleted || echo 'to delete'), ${kept} open-PR packs kept, ${failed} failed"
[[ "$MODE" == "--delete" ]] || echo "(dry run — rerun with --delete to remove)"
(( failed == 0 ))
