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
latest_release=$(gh release list --limit 1 --json tagName,publishedAt -q '.[0]' 2>/dev/null || echo '{}')
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

# Output JSON
cat <<EOF
{
  "last_version": "${last_version}",
  "latest_release": {
    "tag": "${latest_tag}",
    "published_at": "${latest_date}"
  },
  "diff_branch": "${diff_branch}",
  "needs_archive": ${needs_archive},
  "archive_exists": ${archive_exists},
  "next_has_content": ${next_has_content}
}
EOF
