#!/bin/bash
# Template for per-slide TTS audio generation using Gemini 2.5 Flash Preview TTS
# Copy this to pr-walkthrough/generate-audio.sh and customize the slide narrations.
set -euo pipefail

cd "$(dirname "$0")"

GEMINI_API_KEY="${GEMINI_API_KEY:?Set GEMINI_API_KEY environment variable}"
MODEL="gemini-2.5-flash-preview-tts"
ENDPOINT="https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent"
VOICE="Iapetus"

generate_audio() {
  local slide_num="$1"
  local text="$2"
  local out_pcm="audio-${slide_num}.pcm"
  local out_wav="audio-${slide_num}.wav"

  echo "  [tts] Generating ${out_wav}..."

  local json_text
  json_text=$(printf '%s' "$text" | python3 -c 'import json,sys; print(json.dumps(sys.stdin.read()))')

  local body
  body=$(cat <<ENDJSON
{
  "contents": [{"parts": [{"text": ${json_text}}]}],
  "generationConfig": {
    "responseModalities": ["AUDIO"],
    "speechConfig": {
      "voiceConfig": {
        "prebuiltVoiceConfig": {
          "voiceName": "${VOICE}"
        }
      }
    }
  }
}
ENDJSON
)

  local response
  response=$(curl -s -X POST "${ENDPOINT}" \
    -H "x-goog-api-key: ${GEMINI_API_KEY}" \
    -H "Content-Type: application/json" \
    -d "$body")

  local error
  error=$(echo "$response" | python3 -c 'import json,sys; d=json.load(sys.stdin); print(d.get("error",{}).get("message",""))' 2>/dev/null || echo "")
  if [ -n "$error" ]; then
    echo "  [error] Slide ${slide_num}: ${error}"
    return 1
  fi

  echo "$response" | python3 -c '
import json, sys, base64
d = json.load(sys.stdin)
audio_b64 = d["candidates"][0]["content"]["parts"][0]["inlineData"]["data"]
sys.stdout.buffer.write(base64.b64decode(audio_b64))
' > "$out_pcm"

  ffmpeg -y -f s16le -ar 24000 -ac 1 -i "$out_pcm" "$out_wav" 2>/dev/null
  rm "$out_pcm"
}

# --- Customize below ---
# Call generate_audio for each slide with its narration text.
# Example:
#
# echo "Slide 00: Intro"
# generate_audio "00" "Your intro narration here..."
#
# echo "Slide 01: The problem"
# generate_audio "01" "Your narration for slide 1..."
#
# echo ""
# echo "Done! Generated audio files:"
# ls -la audio-*.wav
