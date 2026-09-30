#!/bin/bash
# When each PR reached staging and production. Use the times as era cut points.
# usage: pr-deploys.sh <pr> [pr ...]
# staging: time it reached main (staging deploys main on merge, live ~15 min later).
# production: first deploy on origin/production that contains the PR's main commit or its hotfix
# commit (same title, or a bundled hotfix PR whose body lists it).
cd "$(git rev-parse --show-toplevel)" && git fetch -q origin production main
DEPLOYS=$(git log origin/production --first-parent --reverse --since=120.days --format='%H|%cI|%s' | grep '|Deploy from')
PROD_COMMITS=$(git log origin/production --since=120.days --format='%H|%s')
for pr in "$@"; do
  pr=${pr#\#}
  if ! info=$(gh pr view "$pr" --json mergedAt,mergeCommit,title,baseRefName --jq '"\(.mergedAt // "-")|\(.mergeCommit.oid // "")|\(.baseRefName)|\(.title)"' 2>/dev/null); then
    printf '#%s\tnot found\n' "$pr"; continue
  fi
  IFS='|' read -r merged sha base title <<<"$info"
  # Stacked PR: it reaches main with the PR that merges its base branch.
  while [ "$base" != main ] && [ "$base" != hotfixes ] && [ "$merged" != - ]; do
    parent=$(gh pr list --head "$base" --state merged --json mergedAt,mergeCommit,baseRefName --jq '.[0] | "\(.mergedAt)|\(.mergeCommit.oid)|\(.baseRefName)"')
    [ -z "$parent" ] && { merged=-; break; }
    IFS='|' read -r merged sha base <<<"$parent"
  done
  # Hotfix PRs list what they carry as "- [#123](" or "**Original PR:** [#123](".
  hf=$(gh pr list --base hotfixes --state merged --search "$pr in:body" --json number,body \
    --jq "[.[] | select(.body | test(\"(^|\\\\n)- \\\\[#$pr\\\\]\\\\(|Original PRs?:\\\\*\\\\* \\\\[#$pr\\\\]\\\\(\"))][0].number // empty")
  candidates=("$sha")
  while IFS='|' read -r csha subj; do
    [[ "$subj" == *"$title"* || "$subj" == *"(#$pr)"* || ( -n "$hf" && "$subj" == *"(#$hf)"* ) ]] && candidates+=("$csha")
  done <<<"$PROD_COMMITS"
  prod=""
  while IFS='|' read -r dsha at _; do
    for c in "${candidates[@]}"; do
      [ -n "$c" ] && git merge-base --is-ancestor "$c" "$dsha" 2>/dev/null && { prod=${at:0:16}; break 2; }
    done
  done <<<"$DEPLOYS"
  printf '#%s\tstaging %s\tprod %s\t%s\n' "$pr" "${merged:0:16}" "${prod:-not deployed}" "$title"
done
