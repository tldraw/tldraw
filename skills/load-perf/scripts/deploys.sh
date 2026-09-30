#!/bin/bash
# Deploy timeline for cutting eras. Production deploys are merge commits on origin/production;
# D^1..D is what each one shipped. Staging deploys main on every merge, live ~15 min later.
# usage: deploys.sh [since=YYYY-MM-DD, default 10 days ago] [title regex]
SINCE="${1:-$(date -u -v-10d +%F 2>/dev/null || date -u -d '10 days ago' +%F)}"
RE="${2:-perf|zero|sync|load|postgres}"
cd "$(git rev-parse --show-toplevel)" && git fetch -q origin production main
echo "== production deploys (origin/production)"
git log origin/production --first-parent --reverse --since="$SINCE" --format='%H|%cI|%s' | grep '|Deploy from' |
  while IFS='|' read -r sha at subj; do
    shipped=$(git log --format=%s "$sha^1..$sha^2" 2>/dev/null | grep -v 'Add VSCode extension' | paste -sd ';' -)
    printf '%s  %s  <- %s\n' "${at:0:16}" "${subj%% (*}" "${shipped:0:160}"
  done
echo; echo "== staging (merges matching /$RE/i; a stacked PR shows its merge into its base branch, see pr-deploys.mjs for when it reached main)"
gh pr list --state merged --limit 200 --search "merged:>=$SINCE -base:hotfixes" --json number,title,mergedAt \
  --jq '.[] | "\(.mergedAt[:16]) #\(.number) \(.title)"' | grep -iE "$RE" | grep -v HOTFIX | sort
