#!/bin/bash
# Find PR numbers on the main branch since a release tag.
# Uses `git cherry` to compare patches between origin/main and the
# release tag, excluding commits that were cherry-picked to production
# and already shipped in the release.
#
# Usage: ./get-new-prs-from-main.sh <release-tag>
# Example: ./get-new-prs-from-main.sh v4.4.0
#
# Output:
#   PR numbers (one per line) on stdout, then any commits
#   without PR numbers (hash + title) on stderr.

set -e

if [ -z "$1" ]; then
  echo "Usage: $0 <release-tag>" >&2
  echo "Example: $0 v4.4.0" >&2
  exit 1
fi

RELEASE_TAG="$1"

# Fetch to ensure we have latest refs
git fetch origin main --quiet 2>/dev/null || true

# Verify the tag exists
if ! git rev-parse "$RELEASE_TAG" >/dev/null 2>&1; then
  echo "Error: tag '$RELEASE_TAG' not found" >&2
  exit 1
fi

# The release tag lives on the production branch, which has a separate
# history from main (deploy commits, hotfixes, version bumps). Many
# commits on main after the branch point were cherry-picked to production
# and shipped in the release. We use `git cherry` to compare patches and
# exclude commits that are already in the release — just like
# get-new-prs.sh does for production.
#
# `git cherry <release-tag> origin/main` marks commits unique to main
# with '+' and those already in the release with '-'.
commit_hashes=$(git cherry "$RELEASE_TAG" origin/main 2>/dev/null \
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

# Output unmatched commits to stderr
if [ ${#unmatched[@]} -gt 0 ]; then
  echo "" >&2
  echo "Commits without PR numbers:" >&2
  for line in "${unmatched[@]}"; do
    echo "  $line" >&2
  done
fi
