#!/bin/bash
# sources.sh — say where each PR's "before" and "after" can be recorded.
#
# Usage:
#   ./sources.sh <pr-number> [<pr-number> ...]   (range defaults to origin/production...origin/main)
#   RANGE=<base>...<head> ./sources.sh <pr-number> ...
#
# Prints one tab-separated line per PR: pr, source, before, after, subject.
#
#   staging  the change is on main but not yet on production: record production tldraw.com
#            (before) against staging (after).
#   build    the change already reached production as a hotfix, so production and staging look
#            the same. Build the examples app at the commit before the PR and at the PR.
#
set -euo pipefail

[[ $# -ge 1 ]] || { echo "Usage: sources.sh <pr-number> [<pr-number> ...]" >&2; exit 1; }
RANGE="${RANGE:-origin/production...origin/main}"
BASE="${RANGE%%...*}"
HEAD="${RANGE##*...}"

git fetch -q origin production main
MERGE_BASE="$(git merge-base "$BASE" "$HEAD")"
# Hotfixes are cherry-picked onto production, so they have new SHAs. Match them by PR number.
HOTFIXED="$(git log --format=%s "$MERGE_BASE..origin/production" | grep -oE '\(#[0-9]+\)$' || true)"

for pr in "$@"; do
	pr="${pr#\#}"
	line="$(git log --format='%H%x09%s' "$MERGE_BASE..$HEAD" | grep -E "\(#$pr\)\$" | head -1 || true)"
	if [[ -z "$line" ]]; then
		echo "sources.sh: #$pr isn't in $RANGE" >&2
		exit 1
	fi
	sha="${line%%$'\t'*}"
	subject="${line#*$'\t'}"
	if grep -qxF "(#$pr)" <<<"$HOTFIXED"; then
		printf '%s\tbuild\t%s\t%s\t%s\n' "$pr" "$(git rev-parse "$sha^")" "$sha" "$subject"
	else
		printf '%s\tstaging\t%s\t%s\t%s\n' "$pr" "https://www.tldraw.com/" "https://staging.tldraw.com/" "$subject"
	fi
done
