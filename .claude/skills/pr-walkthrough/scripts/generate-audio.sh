#!/bin/bash
# generate-audio.sh — Generate walkthrough narration audio from a JSON script.
#
# Generates all narration as a single TTS call for consistent voice, then
# splits into per-slide clips using Gemini audio understanding for alignment.
#
# Usage:
#   ./generate-audio.sh <script.json> [output-dir]
#
# Input JSON format:
#   {
#     "style": "Read in a calm, steady, professional tone...",
#     "voice": "Iapetus",           (optional, default: Iapetus)
#     "slides": [
#       "Intro narration text...",
#       "Problem slide narration...",
#       "Approach narration...",
#       ...
#     ]
#   }
#
# Output:
#   <output-dir>/audio-00.wav, audio-01.wav, ...
#   <output-dir>/full-narration.wav (kept for debugging)
#
# Dependencies:
#   ffmpeg / ffprobe
#
# Environment:
#   GEMINI_API_KEY — required. Auto-sourced from .env if not set.
#
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

# --- Args ---
SCRIPT_JSON="${1:?Usage: generate-audio.sh <script.json> [output-dir]}"
OUTPUT_DIR="${2:-.}"

# Resolve relative paths
[[ "$SCRIPT_JSON" != /* ]] && SCRIPT_JSON="$(pwd)/$SCRIPT_JSON"
[[ "$OUTPUT_DIR" != /* ]] && OUTPUT_DIR="$(pwd)/$OUTPUT_DIR"

if [ ! -f "$SCRIPT_JSON" ]; then
  echo "Error: ${SCRIPT_JSON} not found"
  exit 1
fi

mkdir -p "$OUTPUT_DIR"

PYTHON="python3"

# --- API key ---
REPO_ROOT=$(git rev-parse --show-toplevel 2>/dev/null || echo ".")

if [ -z "${GEMINI_API_KEY:-}" ]; then
  if [ -f "${REPO_ROOT}/.env" ]; then
    export $(grep '^GEMINI_API_KEY=' "${REPO_ROOT}/.env" | xargs)
  fi
fi
GEMINI_API_KEY="${GEMINI_API_KEY:?Set GEMINI_API_KEY environment variable or add it to .env}"

# --- Config ---
TTS_MODEL="gemini-2.5-pro-preview-tts"
TTS_ENDPOINT="https://generativelanguage.googleapis.com/v1beta/models/${TTS_MODEL}:generateContent"
ALIGN_MODEL="gemini-2.5-flash"
ALIGN_ENDPOINT="https://generativelanguage.googleapis.com/v1beta/models/${ALIGN_MODEL}:generateContent"
UPLOAD_ENDPOINT="https://generativelanguage.googleapis.com/upload/v1beta/files"
FILES_ENDPOINT="https://generativelanguage.googleapis.com/v1beta/files"
SPEED=1.2  # Speed up narration (1.0 = no change)

# --- Run everything in Python for reliability ---
"$PYTHON" - "$SCRIPT_JSON" "$OUTPUT_DIR" "$GEMINI_API_KEY" "$TTS_MODEL" "$TTS_ENDPOINT" "$SPEED" "$ALIGN_ENDPOINT" "$UPLOAD_ENDPOINT" "$FILES_ENDPOINT" <<'PYTHON_SCRIPT'
import json, sys, os, subprocess, base64, time, urllib.request, re

script_json = sys.argv[1]
output_dir = sys.argv[2]
api_key = sys.argv[3]
tts_model = sys.argv[4]
tts_endpoint = sys.argv[5]
speed = float(sys.argv[6])
align_endpoint = sys.argv[7]
upload_endpoint = sys.argv[8]
files_endpoint = sys.argv[9]

def api_call(endpoint, body_dict, method="POST"):
    body = json.dumps(body_dict).encode()
    req = urllib.request.Request(
        f"{endpoint}?key={api_key}",
        data=body,
        headers={"Content-Type": "application/json"},
        method=method,
    )
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read())

# --- Load narration ---
with open(script_json) as f:
    data = json.load(f)

voice = data.get("voice", "Iapetus")
slides = data["slides"]
style = data.get("style",
    "Read the following in a calm, steady, professional tone. "
    "Speak at a measured pace. Between each numbered section, pause briefly.")

print(f"=== Generating narration audio ===")
print(f"  Voice: {voice}")
print(f"  Slides: {len(slides)}")

# --- Build prompt ---
parts = [style, ""]
for i, text in enumerate(slides):
    parts.append(f"[{i + 1}]")
    parts.append(text)
    parts.append("")
prompt = "\n".join(parts)

# --- Call TTS API ---
print(f"  [tts] Calling {tts_model}...")
try:
    response = api_call(tts_endpoint, {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {
            "responseModalities": ["AUDIO"],
            "speechConfig": {
                "voiceConfig": {
                    "prebuiltVoiceConfig": {
                        "voiceName": voice
                    }
                }
            }
        }
    })
except urllib.error.HTTPError as e:
    error_body = e.read().decode()
    print(f"  [error] TTS failed ({e.code}): {error_body[:500]}")
    sys.exit(1)

# Check for API error
error_msg = response.get("error", {}).get("message", "")
if error_msg:
    print(f"  [error] TTS failed: {error_msg}")
    sys.exit(1)

# Extract audio
audio_b64 = response["candidates"][0]["content"]["parts"][0]["inlineData"]["data"]
pcm_data = base64.b64decode(audio_b64)

pcm_path = os.path.join(output_dir, "full-narration.pcm")
wav_path = os.path.join(output_dir, "full-narration.wav")

with open(pcm_path, "wb") as f:
    f.write(pcm_data)

# Convert PCM to WAV with speed adjustment and resample to 48kHz.
# The TTS API outputs 24kHz PCM. We resample to 48kHz here because AAC
# encoding at 24kHz causes duration mismatches when concatenating segments
# with ffmpeg (reported duration ~2x actual runtime).
subprocess.run([
    "ffmpeg", "-y", "-f", "s16le", "-ar", "24000", "-ac", "1",
    "-i", pcm_path, "-af", f"atempo={speed}", "-ar", "48000", wav_path
], capture_output=True, check=True)
os.remove(pcm_path)

# Get duration
dur_result = subprocess.run(
    ["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", wav_path],
    capture_output=True, text=True
)
total_dur = float(dur_result.stdout.strip())
print(f"  [done] full-narration.wav ({total_dur:.1f}s, {speed}x speed)")

# --- Duration sanity check ---
word_count = sum(len(s.split()) for s in slides)
expected_dur = word_count / 2.5  # ~150 wpm
if total_dur > expected_dur * 3:
    print(f"  [warn] Audio is {total_dur:.0f}s but expected ~{expected_dur:.0f}s for {word_count} words")
    print(f"  [warn] TTS may have added excessive pauses or extra content")

# --- Alignment via Gemini ---
print()
print("=== Aligning segments via Gemini ===")

# Upload the WAV file to Gemini Files API
print(f"  [upload] Uploading full-narration.wav...")
wav_size = os.path.getsize(wav_path)
with open(wav_path, "rb") as f:
    wav_bytes = f.read()

upload_req = urllib.request.Request(
    f"{upload_endpoint}?key={api_key}",
    data=wav_bytes,
    headers={
        "Content-Type": "audio/wav",
        "Content-Length": str(wav_size),
        "X-Goog-Upload-Protocol": "raw",
        "X-Goog-Upload-Command": "upload, finalize",
        "X-Goog-Upload-Header-Content-Type": "audio/wav",
    },
    method="POST",
)
with urllib.request.urlopen(upload_req) as resp:
    upload_response = json.loads(resp.read())

file_uri = upload_response["file"]["uri"]
file_name = upload_response["file"]["name"]  # e.g. "files/abc123"
# Extract just the ID for URL construction
file_id = file_name.split("/")[-1] if "/" in file_name else file_name
print(f"  [upload] Done: {file_name}")

# Wait for file to be processed
for attempt in range(30):
    status_req = urllib.request.Request(
        f"{files_endpoint}/{file_id}?key={api_key}",
        method="GET",
    )
    with urllib.request.urlopen(status_req) as resp:
        file_status = json.loads(resp.read())
    state = file_status.get("state", "")
    if state == "ACTIVE":
        break
    print(f"  [upload] Waiting for processing... ({state})")
    time.sleep(2)
else:
    print(f"  [error] File not ready after 60s")
    sys.exit(1)

# Ask Gemini to find segment start times
segments_list = "\n".join(f"  Segment {i}: {text[:80]}{'...' if len(text) > 80 else ''}"
                          for i, text in enumerate(slides))

align_prompt = f"""Listen to this audio narration and identify where each of the following segments begins, and where the last segment ends.

The audio contains {len(slides)} segments read sequentially. For each segment, tell me the start time in seconds. Also include one final entry for the end time of the last segment (where speech stops, ignoring any trailing silence).

{segments_list}

Return ONLY a JSON array of numbers representing timestamps in seconds. The array must have exactly {len(slides) + 1} entries: one start time per segment, plus the end time of the final segment. For example: [0.0, 12.5, 28.3, ..., 45.0]

The first entry should be 0.0 or close to it. The last entry should be where the narration ends, not the total audio length."""

print(f"  [align] Asking Gemini to find segment boundaries...")
try:
    align_response = api_call(align_endpoint, {
        "contents": [{
            "parts": [
                {"fileData": {"mimeType": "audio/wav", "fileUri": file_uri}},
                {"text": align_prompt},
            ]
        }],
        "generationConfig": {
            "temperature": 0,
            "responseMimeType": "application/json",
        }
    })
except urllib.error.HTTPError as e:
    error_body = e.read().decode()
    print(f"  [error] Alignment failed ({e.code}): {error_body[:500]}")
    sys.exit(1)

# Parse response
align_text = align_response["candidates"][0]["content"]["parts"][0]["text"]
print(f"  [align] Raw response: {align_text.strip()}")

timestamps = json.loads(align_text)

# We expect N+1 entries (N start times + 1 end time for the last segment).
# If we got exactly N, the model omitted the end time — use total_dur.
# If we got N+1, the last entry is the end time.
expected = len(slides) + 1
if len(timestamps) == len(slides):
    print(f"  [info] Got {len(timestamps)} timestamps (no end time), using audio duration")
    timestamps.append(total_dur)
elif len(timestamps) != expected:
    print(f"  [warn] Expected {expected} timestamps, got {len(timestamps)}")
    while len(timestamps) < expected:
        timestamps.append(timestamps[-1] if timestamps else 0.0)
    timestamps = timestamps[:expected]

# Ensure timestamps are sorted and within bounds
timestamps = [max(0.0, min(float(t), total_dur)) for t in timestamps]
for i in range(1, len(timestamps)):
    if timestamps[i] < timestamps[i - 1]:
        timestamps[i] = timestamps[i - 1]

cut_points = timestamps[:len(slides)]  # start times
# Use full audio duration for the last segment's end — the alignment's end-time
# estimate often clips the final word.
end_time = total_dur

print(f"  [align] Segment starts: {[f'{t:.1f}s' for t in cut_points]}")
print(f"  [align] Narration ends: {end_time:.1f}s (audio total: {total_dur:.1f}s)")

# --- Split and collect durations ---
print()
print("=== Splitting into per-slide audio ===")
durations = {}

for i in range(len(slides)):
    num = f"{i:02d}"
    start = cut_points[i]
    end = cut_points[i + 1] if i + 1 < len(cut_points) else end_time
    dur = end - start

    out_path = os.path.join(output_dir, f"audio-{num}.wav")
    print(f"  audio-{num}.wav: {start:.1f}s -> {end:.1f}s ({dur:.1f}s)")

    subprocess.run([
        "ffmpeg", "-y", "-i", wav_path,
        "-ss", str(start), "-to", str(end), "-c", "copy", out_path
    ], capture_output=True)

    durations[f"audio-{num}.wav"] = round(dur, 2)

# --- Check for zero-length clips (TTS truncation) ---
empty_clips = [k for k, v in durations.items() if v <= 0.01]
if empty_clips:
    print(f"\n  [warn] TTS truncated audio — {len(empty_clips)} segment(s) have no audio: {empty_clips}")
    print(f"  [warn] Reduce narration length or number of segments and retry.")
    sys.exit(1)

# --- Trim silence from each clip ---
MAX_SILENCE = 1.5  # max seconds of leading/trailing silence per clip (~3s total gap between slides)
SILENCE_THRESHOLD = "-40dB"
print()
print("=== Trimming silence (max 1s lead/trail) ===")

for i in range(len(slides)):
    num = f"{i:02d}"
    clip_path = os.path.join(output_dir, f"audio-{num}.wav")

    # Detect silence at start and end using silencedetect
    detect = subprocess.run([
        "ffmpeg", "-i", clip_path, "-af",
        f"silencedetect=noise={SILENCE_THRESHOLD}:d=0.1",
        "-f", "null", "-"
    ], capture_output=True, text=True)
    stderr = detect.stderr

    # Get clip duration
    dur_res = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", clip_path],
        capture_output=True, text=True
    )
    clip_dur = float(dur_res.stdout.strip())

    # Parse silence periods
    silence_starts = re.findall(r'silence_start: ([\d.]+)', stderr)
    silence_ends = re.findall(r'silence_end: ([\d.]+)', stderr)

    # Find leading silence: silence that starts at ~0
    trim_start = 0.0
    if silence_starts and float(silence_starts[0]) < 0.05:
        if silence_ends:
            leading_silence = float(silence_ends[0])
            if leading_silence > MAX_SILENCE:
                trim_start = leading_silence - MAX_SILENCE

    # Find trailing silence: silence that ends at ~clip_dur
    # Skip trailing trim on last segment — it's followed by the outro and
    # the silence detector often clips the final word.
    trim_end = clip_dur
    is_last = (i == len(slides) - 1)
    if not is_last and silence_starts:
        last_silence_start = float(silence_starts[-1])
        # Check if this silence extends to end of clip
        if last_silence_start > 0.05:  # not the leading silence
            trailing_silence = clip_dur - last_silence_start
            if trailing_silence > MAX_SILENCE:
                trim_end = last_silence_start + MAX_SILENCE

    if trim_start > 0 or trim_end < clip_dur:
        trimmed_path = clip_path + ".tmp.wav"
        subprocess.run([
            "ffmpeg", "-y", "-i", clip_path,
            "-ss", str(trim_start), "-to", str(trim_end),
            "-c", "copy", trimmed_path
        ], capture_output=True)
        os.replace(trimmed_path, clip_path)
        new_dur = trim_end - trim_start
        durations[f"audio-{num}.wav"] = round(new_dur, 2)
        print(f"  audio-{num}.wav: {clip_dur:.1f}s -> {new_dur:.1f}s (trimmed {clip_dur - new_dur:.1f}s)")
    else:
        print(f"  audio-{num}.wav: {clip_dur:.1f}s (no trim needed)")

# --- Write durations.json ---
durations_path = os.path.join(output_dir, "durations.json")
with open(durations_path, "w") as f:
    json.dump(durations, f, indent=2)
print(f"\n  Wrote durations.json ({len(durations)} entries)")

# --- Clean up uploaded file ---
try:
    delete_req = urllib.request.Request(
        f"{files_endpoint}/{file_id}?key={api_key}",
        method="DELETE",
    )
    urllib.request.urlopen(delete_req)
except Exception:
    pass  # best-effort cleanup

print()
print("=== Done ===")
PYTHON_SCRIPT

echo ""
echo "Output:"
ls -la "${OUTPUT_DIR}"/audio-*.wav 2>/dev/null || echo "  (no files generated)"
