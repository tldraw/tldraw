#!/bin/bash
# Get changelog status: versions, whether archival is needed, and the diff branch
#
# Usage: ./get-changelog-status.sh
# Output: JSON with version info and status

set -e

RELEASES_DIR="apps/docs/content/releases"
NEXT_FILE="$RELEASES_DIR/next.mdx"

# Extract last_version from next.mdx frontmatter (if present)
last_version=""
if [ -f "$NEXT_FILE" ]; then
  last_version=$(grep -E "^last_version:" "$NEXT_FILE" 2>/dev/null | sed "s/last_version: *//" | tr -d "'\"\n" || echo "")
fi

# Get the latest published release from GitHub
latest_release=$(gh release list --exclude-drafts --limit 1 --json tagName,publishedAt -q '.[0]' 2>/dev/null || echo '{}')
latest_tag=$(echo "$latest_release" | jq -r '.tagName // empty')
latest_date=$(echo "$latest_release" | jq -r '.publishedAt // empty')

# Determine if we need to archive (latest release is newer than last_version)
needs_archive="false"
if [ -n "$latest_tag" ] && [ -n "$last_version" ]; then
  if [ "$latest_tag" != "$last_version" ]; then
    needs_archive="true"
  fi
elif [ -n "$latest_tag" ] && [ -z "$last_version" ]; then
  # No last_version set, assume we might need to check
  needs_archive="unknown"
fi

# Determine the release branch to diff against
# e.g., v4.3.0 -> v4.3.x, or if latest is v4.3.1 -> v4.3.x
diff_branch=""
if [ -n "$latest_tag" ]; then
  # Extract major.minor from tag (v4.3.0 -> 4.3)
  version_nums=$(echo "$latest_tag" | sed 's/^v//' | cut -d. -f1,2)
  diff_branch="v${version_nums}.x"
fi

# Check if the archive file already exists
archive_exists="false"
if [ -n "$latest_tag" ]; then
  archive_file="$RELEASES_DIR/${latest_tag}.mdx"
  if [ -f "$archive_file" ]; then
    archive_exists="true"
  fi
fi

# Check if next.mdx has content (more than just frontmatter)
next_has_content="false"
if [ -f "$NEXT_FILE" ]; then
  # Count lines after frontmatter (after second ---)
  content_lines=$(awk '/^---$/{c++;next}c==2' "$NEXT_FILE" | grep -v '^[[:space:]]*$' | wc -l | tr -d ' ')
  if [ "$content_lines" -gt 0 ]; then
    next_has_content="true"
  fi
fi

# Determine source based on weeks since the last minor/major release.
# The SDK releases every 4 weeks. During the first 3 weeks (development),
# we gather PRs from main. At 3+ weeks (freeze week), we switch to production.
#
# Find the last minor or major release (skip patches like v4.3.1, v4.3.2)
source="main"
last_minor_date=""
if [ -n "$latest_tag" ]; then
  # Get the .0 release for the current minor version (e.g., v4.4.0)
  minor_tag=$(echo "$latest_tag" | sed 's/^v//' | cut -d. -f1,2)
  minor_release_tag="v${minor_tag}.0"
  # Get the publish date of that .0 release
  last_minor_date=$(gh release view "$minor_release_tag" --json publishedAt -q '.publishedAt' 2>/dev/null || echo "")
  if [ -n "$last_minor_date" ]; then
    # Calculate weeks since the minor release
    release_epoch=$(date -jf "%Y-%m-%dT%H:%M:%SZ" "$last_minor_date" "+%s" 2>/dev/null || date -d "$last_minor_date" "+%s" 2>/dev/null || echo "")
    now_epoch=$(date "+%s")
    if [ -n "$release_epoch" ]; then
      days_since=$(( (now_epoch - release_epoch) / 86400 ))
      weeks_since=$(( days_since / 7 ))
      if [ "$weeks_since" -ge 3 ]; then
        source="production"
      fi
    fi
  fi
fi

# The last tag is the latest release tag (used by get-new-prs-from-main.sh)
last_tag="${latest_tag}"

# Output JSON
cat <<EOF
{
  "last_version": "${last_version}",
  "latest_release": {
    "tag": "${latest_tag}",
    "published_at": "${latest_date}"
  },
  "diff_branch": "${diff_branch}",
  "last_tag": "${last_tag}",
  "source": "${source}",
  "needs_archive": ${needs_archive},
  "archive_exists": ${archive_exists},
  "next_has_content": ${next_has_content}
}
EOF
