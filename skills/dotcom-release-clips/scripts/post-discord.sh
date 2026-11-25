#!/bin/bash
# post-discord.sh — post one clip to Discord with its caption.
#
# Usage:
#   ./post-discord.sh [--dry-run] <caption-file> <clip.mp4>
#
# Posts through the webhook in DISCORD_CLIPS_WEBHOOK_URL. With --dry-run, prints what would be
# sent instead. Never echo the webhook URL: this repo is public and so are its CI logs.
#
set -euo pipefail

DRY_RUN=false
if [[ "${1:-}" == "--dry-run" ]]; then
	DRY_RUN=true
	shift
fi
CAPTION_FILE="${1:?Usage: post-discord.sh [--dry-run] <caption-file> <clip.mp4>}"
CLIP="${2:?Usage: post-discord.sh [--dry-run] <caption-file> <clip.mp4>}"
[[ -f "$CLIP" ]] || { echo "post-discord.sh: no such clip: $CLIP" >&2; exit 1; }

CAPTION="$(cat "$CAPTION_FILE")"
if (( ${#CAPTION} > 2000 )); then
	echo "post-discord.sh: caption is ${#CAPTION} characters; Discord's limit is 2000" >&2
	exit 1
fi
SIZE=$(wc -c < "$CLIP")
# Discord's per-message upload limit for webhooks on an unboosted server
if (( SIZE > 10 * 1024 * 1024 )); then
	echo "post-discord.sh: $CLIP is $(( SIZE / 1024 / 1024 )) MB; the limit is 10 MB" >&2
	exit 1
fi

# parse: [] so nothing in a caption can ever ping @everyone, a role or a person
PAYLOAD="$(jq -n --arg content "$CAPTION" '{content: $content, allowed_mentions: {parse: []}}')"

if $DRY_RUN; then
	echo "--- would post $(basename "$CLIP") ($(( SIZE / 1024 )) KB) with:"
	echo "$CAPTION"
	exit 0
fi

if [[ -z "${DISCORD_CLIPS_WEBHOOK_URL:-}" ]]; then
	echo "post-discord.sh: set DISCORD_CLIPS_WEBHOOK_URL, or pass --dry-run" >&2
	exit 1
fi

# --form-string so the caption is sent as text even if it starts with @ or <
STATUS=$(curl -sS -o /tmp/post-discord-response.$$ -w '%{http_code}' -X POST \
	--form-string "payload_json=$PAYLOAD" \
	-F "files[0]=@$CLIP;type=video/mp4" \
	"$DISCORD_CLIPS_WEBHOOK_URL")
if [[ "$STATUS" != 2* ]]; then
	echo "post-discord.sh: Discord returned HTTP $STATUS: $(cat /tmp/post-discord-response.$$)" >&2
	rm -f /tmp/post-discord-response.$$
	exit 1
fi
rm -f /tmp/post-discord-response.$$
echo "Posted $(basename "$CLIP")"
