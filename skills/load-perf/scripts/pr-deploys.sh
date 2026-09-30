#!/bin/bash
# When each PR reached staging and production. Use the times as era cut points.
# usage: pr-deploys.sh <pr> [pr ...]
# staging: merge time (staging deploys main on merge, live ~15 min later).
# production: first "Deploy from" on origin/production that carries the PR, either as a hotfix
# commit (same title, or a bundled hotfix listing the PR) or a main deploy containing the merge commit.
cd "$(git rev-parse --show-toplevel)" && git fetch -q origin production main
PROD_LOG=$(git log origin/production --since=60.days --reverse --format='%cI|%s')
for pr in "$@"; do
  pr=${pr#\#}
  read -r merged sha title < <(gh pr view "$pr" --json mergedAt,mergeCommit,title --jq '"\(.mergedAt // "-") \(.mergeCommit.oid // "-") \(.title)"')
  prod=$(awk -F'|' -v t="$title" -v n="(#$pr)" '
    found && /\|Deploy from/ {print substr($1,1,16); exit}
    !found && (index($2, t) || index($2, n)) && !/\|Deploy from/ {found=1}' <<<"$PROD_LOG")
  if [ -z "$prod" ]; then
    # Bundled hotfixes list their originals in the body, e.g. "Bundles #10897, #10876 and #10872".
    hf=$(gh pr list --base hotfixes --state merged --search "$pr in:body" --json number --jq '.[0].number // empty')
    [ -n "$hf" ] && prod=$(awk -F'|' -v n="(#$hf)" '
      found && /\|Deploy from/ {print substr($1,1,16); exit}
      !found && index($2, n) {found=1}' <<<"$PROD_LOG")
  fi
  if [ -z "$prod" ] && [ "$sha" != "-" ]; then
    while IFS='|' read -r at subj; do
      main_sha=$(sed -nE 's/^Deploy from main \(([0-9a-f]+)\).*/\1/p' <<<"$subj")
      [ -n "$main_sha" ] && git merge-base --is-ancestor "$sha" "$main_sha" 2>/dev/null && { prod=${at:0:16}; break; }
    done < <(grep '|Deploy from main' <<<"$PROD_LOG")
  fi
  printf '#%s\tstaging %s\tprod %s\t%s\n' "$pr" "${merged:0:16}" "${prod:-not deployed}" "$title"
done
