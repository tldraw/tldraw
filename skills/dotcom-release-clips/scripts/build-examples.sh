#!/bin/bash
# build-examples.sh — build the examples app at a commit, for a "before" or "after" that is no
# longer deployed anywhere (a change that went out as a hotfix, or an older release).
#
# Usage:
#   ./build-examples.sh <commit> <out-dir>
#
# Serve <out-dir> with serve.mjs and record against /develop, which exposes window.editor.
#
set -euo pipefail

COMMIT="${1:?Usage: build-examples.sh <commit> <out-dir>}"
OUT="${2:?Usage: build-examples.sh <commit> <out-dir>}"
[[ "$OUT" != /* ]] && OUT="$(pwd)/$OUT"

SKILL_DIR="$(cd "$(dirname "$0")/.." && pwd)"
REPO="$(git -C "$SKILL_DIR" rev-parse --show-toplevel)"
SHA="$(git -C "$REPO" rev-parse --verify "$COMMIT^{commit}")"
WT="$SKILL_DIR/tmp/worktrees/${SHA:0:10}"

if [[ -f "$OUT/index.html" ]]; then
	echo "Already built: $OUT"
	exit 0
fi

mkdir -p "$(dirname "$WT")"
if [[ ! -d "$WT" ]]; then
	git -C "$REPO" worktree add --detach "$WT" "$SHA" >/dev/null
fi
# A worktree only shares git objects; remove it even if the build fails, or `git worktree list`
# fills up with stale entries
trap 'git -C "$REPO" worktree remove --force "$WT" >/dev/null 2>&1 || true' EXIT

echo "=== Building examples at ${SHA:0:10} ==="
cd "$WT"
HUSKY=0 pnpm install --frozen-lockfile >/dev/null
pnpm exec turbo run refresh-assets >/dev/null
cd apps/examples
pnpm exec vite build --outDir "$OUT" --emptyOutDir >/dev/null
echo "Built: $OUT"
