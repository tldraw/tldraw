#!/bin/bash
# Deploy timeline for cutting eras. Production = deploy commits on origin/production.
# Staging deploys main on every merge, so staging eras = merge time + ~15 min.
# usage: deploys.sh [since=YYYY-MM-DD, default 10 days ago] [title regex]
SINCE="${1:-$(date -u -v-10d +%F 2>/dev/null || date -u -d '10 days ago' +%F)}"
RE="${2:-perf|zero|comment|sync|load|hyperdrive|clerk|flag|postgres}"
cd "$(git rev-parse --show-toplevel)" && git fetch -q origin production main
echo "== production deploys (origin/production)"
git log origin/production --since="$SINCE" --reverse --format='%cI|%s' | awk -F'|' '
  /\|Deploy from/ {print substr($1,1,16) "  " substr($2,1,index($2," (")-1) "  <- " substr(last,1,160); last=""; next}
  !/Add VSCode extension/ {last = (last ? last " ; " : "") $2}'
echo; echo "== staging (main merges matching /$RE/i)"
gh pr list --state merged --limit 200 --search "merged:>=$SINCE base:main" --json number,title,mergedAt \
  --jq '.[] | "\(.mergedAt[:16]) #\(.number) \(.title)"' | grep -iE "$RE" | grep -v HOTFIX | sort
