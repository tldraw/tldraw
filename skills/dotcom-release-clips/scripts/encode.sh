#!/bin/bash
# encode.sh — join recorded takes into one clip.
#
# Usage:
#   ./encode.sh <name> <take-dir> [<take-dir> ...]
#
# Each <take-dir> is a shoot.mjs --out folder. Takes play in order (before, then after).
# Writes to the skill's tmp/ folder:
#   <name>.mp4        1920x1080 H.264, for Discord and social
#   <name>.gif        1120x630, for the before/after archive
#   <name>-sheet.png  every 12th frame, for checking the take without playing it
#
set -euo pipefail

NAME="${1:?Usage: encode.sh <name> <take-dir> [<take-dir> ...]}"
shift
[[ $# -ge 1 ]] || { echo "encode.sh: give at least one take folder" >&2; exit 1; }
command -v ffmpeg >/dev/null || { echo "encode.sh: ffmpeg is required" >&2; exit 1; }

OUT_DIR="$(cd "$(dirname "$0")/.." && pwd)/tmp"
mkdir -p "$OUT_DIR"
inputs=()
labels=""
counts=()
for take in "$@"; do
	[[ -f "$take/meta.json" ]] || { echo "encode.sh: $take has no meta.json; record it with shoot.mjs" >&2; exit 1; }
	fps=$(jq -r .fps "$take/meta.json")
	inputs+=(-framerate "$fps" -i "$take/frames/%05d.png")
	counts+=("$(jq -r .frames "$take/meta.json")")
	labels+="[$(( ${#inputs[@]} / 4 - 1 ))]"
done
# Before and after come from one shot, so a different frame count means one take went wrong
if [[ $# -gt 1 && "$(printf '%s\n' "${counts[@]}" | sort -u | wc -l)" -ne 1 ]]; then
	echo "encode.sh: takes have different frame counts (${counts[*]}); re-record them" >&2
	exit 1
fi

JOIN="${labels}concat=n=$#:v=1"
TOTAL=0
for c in "${counts[@]}"; do TOTAL=$(( TOTAL + c )); done
ROWS=$(( (TOTAL / 12 + 1 + 5) / 6 ))
ffmpeg -loglevel error -y "${inputs[@]}" \
	-filter_complex "$JOIN,scale=1920:1080:flags=lanczos,format=yuv420p" \
	-c:v libx264 -crf 16 -preset slow -profile:v high -movflags +faststart \
	"$OUT_DIR/$NAME.mp4"
# stats_mode=diff builds the palette from what changes between frames, which keeps the cursor
# and the changed shapes from banding on tldraw's flat colours
ffmpeg -loglevel error -y "${inputs[@]}" \
	-filter_complex "$JOIN,scale=1120:630:flags=lanczos,split[a][b];[a]palettegen=stats_mode=diff[p];[b][p]paletteuse=dither=sierra2_4a:diff_mode=rectangle" \
	-r "$fps" "$OUT_DIR/$NAME.gif"
ffmpeg -loglevel error -y "${inputs[@]}" \
	-filter_complex "$JOIN,select='not(mod(n\,12))',scale=448:-1,tile=6x$ROWS" -frames:v 1 \
	"$OUT_DIR/$NAME-sheet.png"

for f in "$OUT_DIR/$NAME.mp4" "$OUT_DIR/$NAME.gif" "$OUT_DIR/$NAME-sheet.png"; do
	echo "$f ($(( $(wc -c < "$f") / 1024 )) KB)"
done
