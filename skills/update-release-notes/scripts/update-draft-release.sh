#!/bin/bash
# Update (or create) the draft GitHub release for the next minor version using the
# current next.mdx content. publish-new.ts finds this draft by name (vX.Y.0) and
# publishes its body verbatim at release time, so keeping it in sync with next.mdx
# means the GitHub release and the docs release page always match.
#
# Usage: ./update-draft-release.sh <tldraw-repo-dir>
#
# Requires a local clone of tldraw/tldraw and an authenticated gh CLI.

set -e

if [ -z "$1" ]; then
  echo "Usage: $0 <tldraw-repo-dir>" >&2
  echo "Example: $0 /tmp/tldraw" >&2
  exit 1
fi

TLDRAW_REPO="$1"
NEXT_FILE="$TLDRAW_REPO/apps/docs/content/releases/next.mdx"

if [ ! -f "$NEXT_FILE" ]; then
  echo "next.mdx not found at $NEXT_FILE" >&2
  exit 1
fi

# The draft tracks the next minor release. Derive it from last_version (the most
# recent published release recorded in next.mdx frontmatter): bump minor, patch 0.
# e.g. last_version v5.2.0 -> draft v5.3.0.
last_version=$(grep -E "^last_version:" "$NEXT_FILE" | head -1 | sed "s/last_version: *//" | tr -d "'\"[:space:]")
if [ -z "$last_version" ]; then
  echo "Could not read last_version from $NEXT_FILE" >&2
  exit 1
fi

major=$(echo "$last_version" | sed 's/^v//' | cut -d. -f1)
minor=$(echo "$last_version" | sed 's/^v//' | cut -d. -f2)
next_tag="v${major}.$((minor + 1)).0"

# Body = next.mdx with the frontmatter block stripped (everything after the second ---).
body_file=$(mktemp)
awk 'f{print} /^---$/{c++; if(c==2){f=1}}' "$NEXT_FILE" > "$body_file"

# Fail loudly if there is nothing to publish rather than pushing an empty draft.
if ! grep -qE '[^[:space:]]' "$body_file"; then
  echo "next.mdx has no content below the frontmatter; refusing to write an empty draft." >&2
  rm -f "$body_file"
  exit 1
fi

echo "Draft release target: $next_tag" >&2

# Look up an existing release for this tag (finds drafts too).
existing=$(gh release view "$next_tag" -R tldraw/tldraw --json isDraft 2>/dev/null || echo "")

if [ -n "$existing" ]; then
  is_draft=$(echo "$existing" | jq -r '.isDraft')
  if [ "$is_draft" != "true" ]; then
    echo "Release $next_tag already exists and is published; refusing to edit." >&2
    rm -f "$body_file"
    exit 1
  fi
  echo "Updating existing draft release $next_tag" >&2
  gh release edit "$next_tag" -R tldraw/tldraw --title "$next_tag" --notes-file "$body_file"
else
  echo "Creating new draft release $next_tag" >&2
  gh release create "$next_tag" -R tldraw/tldraw --draft --title "$next_tag" --notes-file "$body_file"
fi

rm -f "$body_file"
echo "Done. Draft release $next_tag is in sync with next.mdx." >&2
