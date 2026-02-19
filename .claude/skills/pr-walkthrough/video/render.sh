#!/bin/bash
# render.sh — Render a pr-walkthrough video from a manifest JSON file.
#
# Usage:
#   ./render.sh <manifest.json> <output.mp4>
#
# The manifest references audio files by filename (e.g. "audio-00.wav").
# This script copies the manifest and all referenced audio/image files into
# the Remotion public/ directory, installs deps if needed, and renders.
#
set -euo pipefail

MANIFEST="${1:?Usage: render.sh <manifest.json> <output.mp4>}"
OUTPUT="${2:?Usage: render.sh <manifest.json> <output.mp4>}"

# Resolve paths
[[ "$MANIFEST" != /* ]] && MANIFEST="$(pwd)/$MANIFEST"
[[ "$OUTPUT" != /* ]] && OUTPUT="$(pwd)/$OUTPUT"

if [ ! -f "$MANIFEST" ]; then
  echo "Error: Manifest not found: $MANIFEST"
  exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PUBLIC_DIR="$SCRIPT_DIR/public"
MANIFEST_DIR="$(dirname "$MANIFEST")"

# Clean public/ to avoid stale assets from previous renders, but preserve
# committed assets like tldraw.svg that are needed for intro/outro slides.
PRESERVED_FILES=()
for f in "$PUBLIC_DIR"/tldraw.svg; do
  if [ -f "$f" ]; then
    PRESERVED_FILES+=("$f")
    cp "$f" "/tmp/.render-preserve-$$-$(basename "$f")"
  fi
done
rm -rf "$PUBLIC_DIR"
mkdir -p "$PUBLIC_DIR"
for f in "${PRESERVED_FILES[@]}"; do
  base="$(basename "$f")"
  cp "/tmp/.render-preserve-$$-$base" "$PUBLIC_DIR/$base"
  rm -f "/tmp/.render-preserve-$$-$base"
done
mkdir -p "$(dirname "$OUTPUT")"

echo "=== Rendering walkthrough video ==="
echo "  Manifest: $MANIFEST"
echo "  Output:   $OUTPUT"

# --- Copy manifest into public/ ---
cp "$MANIFEST" "$PUBLIC_DIR/manifest.json"

# --- Copy referenced audio + image files into public/ ---
# Extract all audio/src filenames from the manifest
REFERENCED_FILES=$(python3 -c "
import json, sys
with open(sys.argv[1]) as f:
    m = json.load(f)
files = set()
for s in m['slides']:
    if 'audio' in s and s['audio']:
        files.add(s['audio'])
    if 'src' in s and s['src']:
        files.add(s['src'])
print('\n'.join(sorted(files)))
" "$MANIFEST")

for FILE in $REFERENCED_FILES; do
  SRC="$MANIFEST_DIR/$FILE"
  if [ -f "$SRC" ]; then
    mkdir -p "$(dirname "$PUBLIC_DIR/$FILE")"
    cp "$SRC" "$PUBLIC_DIR/$FILE"
    echo "  Copied: $FILE"
  else
    echo "  Warning: Referenced file not found: $SRC"
  fi
done

# --- Copy tldraw.svg from assets if not already in public/ ---
ASSETS_DIR="$SCRIPT_DIR/../assets"
if [ ! -f "$PUBLIC_DIR/tldraw.svg" ] && [ -f "$ASSETS_DIR/tldraw.svg" ]; then
  cp "$ASSETS_DIR/tldraw.svg" "$PUBLIC_DIR/tldraw.svg"
  echo "  Copied: tldraw.svg (from assets)"
fi

# --- Install deps if needed ---
if [ ! -d "$SCRIPT_DIR/node_modules" ]; then
  echo ""
  echo "  Installing dependencies..."
  (cd "$SCRIPT_DIR" && npm install --silent)
fi

# --- Render ---
echo ""
echo "  Rendering..."
RENDER_OUTPUT="$OUTPUT"
# Render to a temp file first so we can re-encode for smaller size
TEMP_RENDER="$(dirname "$OUTPUT")/.render-temp-$$.mp4"
cleanup_temp() { rm -f "$TEMP_RENDER"; }
trap cleanup_temp EXIT
(cd "$SCRIPT_DIR" && npx remotion render Walkthrough "$TEMP_RENDER" \
  --props='{"manifestPath":"manifest.json"}' \
  --log=error)

# --- Re-encode for smaller file size ---
# Remotion's defaults produce ~2.5 Mbps video which is excessive for mostly-static
# code slides. CRF 28 with preset slow gives identical visual quality at ~5x smaller.
if [ -f "$TEMP_RENDER" ]; then
  echo "  Compressing..."
  ffmpeg -i "$TEMP_RENDER" \
    -c:v libx264 -crf 28 -preset slow \
    -c:a aac -b:a 128k \
    -y "$OUTPUT" 2>/dev/null
  rm -f "$TEMP_RENDER"
fi

# --- Report ---
if [ -f "$OUTPUT" ]; then
  FINAL_DUR=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$OUTPUT" 2>/dev/null || echo "unknown")
  FINAL_SIZE=$(ls -lh "$OUTPUT" | awk '{print $5}')
  echo ""
  echo "=== Done ==="
  echo "  Output:   $OUTPUT"
  echo "  Duration: ${FINAL_DUR}s"
  echo "  Size:     $FINAL_SIZE"
else
  echo ""
  echo "Error: Render failed — output file not created"
  exit 1
fi
