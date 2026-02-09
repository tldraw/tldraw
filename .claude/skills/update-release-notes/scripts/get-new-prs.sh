#!/bin/bash
# Find PR numbers merged to main since a release branch
#
# Usage: ./get-new-prs.sh <release-branch>
# Example: ./get-new-prs.sh v4.2.x
# Output: One PR number per line

set -e

if [ -z "$1" ]; then
  echo "Usage: $0 <release-branch>" >&2
  echo "Example: $0 v4.2.x" >&2
  exit 1
fi

RELEASE_BRANCH="$1"

# Fetch to ensure we have latest refs
git fetch origin main "$RELEASE_BRANCH" --quiet 2>/dev/null || true

# Get commits on main that aren't on the release branch
# Extract PR numbers from commit messages (format: "... (#1234)")
git log "origin/main" "^origin/$RELEASE_BRANCH" --oneline 2>/dev/null \
  | grep -oE '#[0-9]+' \
  | sed 's/#//' \
  | sort -rn \
  | uniq
