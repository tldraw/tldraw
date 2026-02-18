#!/bin/bash
# Find PR numbers on the production branch since a release branch.
# Uses `git cherry` (like extract-draft-changelog.tsx) to correctly
# handle cherry-picked hotfix commits.
#
# Usage: ./get-new-prs.sh <release-branch>
# Example: ./get-new-prs.sh v4.2.x
#
# Output:
#   PR numbers (one per line), then a blank line, then any commits
#   without PR numbers (hash + title) so the caller can investigate.

set -e

if [ -z "$1" ]; then
  echo "Usage: $0 <release-branch>" >&2
  echo "Example: $0 v4.2.x" >&2
  exit 1
fi

RELEASE_BRANCH="$1"

# Fetch to ensure we have latest refs
git fetch origin production "$RELEASE_BRANCH" --quiet 2>/dev/null || true

# Use git cherry to find commits on production that aren't on the
# release branch. git cherry compares patches (not hashes), so it
# correctly handles cherry-picks and hotfixes.
# Lines starting with '+' are unique to production.
commit_hashes=$(git cherry "origin/$RELEASE_BRANCH" origin/production 2>/dev/null \
  | grep '^+' \
  | cut -d' ' -f2)

pr_numbers=()
unmatched=()

for hash in $commit_hashes; do
  # Get the first line of the commit message
  title=$(git log -1 --pretty=format:%s "$hash" 2>/dev/null)

  # Skip [skip ci] commits (version bumps, deploys)
  if echo "$title" | grep -q '\[skip ci\]'; then
    continue
  fi

  # Skip deploy commits
  if echo "$title" | grep -q '^Deploy from'; then
    continue
  fi

  # Extract PR number from commit message (format: "... (#1234)")
  pr=$(echo "$title" | grep -oE '#[0-9]+' | head -1 | sed 's/#//')

  if [ -n "$pr" ]; then
    pr_numbers+=("$pr")
  else
    unmatched+=("$hash $title")
  fi
done

# Output unique PR numbers, sorted descending
printf '%s\n' "${pr_numbers[@]}" | sort -rn | uniq

# Output unmatched commits (hotfixes without PR numbers) to stderr
if [ ${#unmatched[@]} -gt 0 ]; then
  echo "" >&2
  echo "Commits without PR numbers (likely hotfixes):" >&2
  for line in "${unmatched[@]}"; do
    echo "  $line" >&2
  done
fi
