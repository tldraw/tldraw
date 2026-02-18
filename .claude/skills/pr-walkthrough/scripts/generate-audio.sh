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
    export $(grep '^GEMINI_API_KEY=' "${REPO_ROOT}/.env" | xargs) 2>/dev/null || true
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
import json, sys, os, subprocess, base64, time, urllib.request, re, atexit

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

word_count = sum(len(s.split()) for s in slides)
print(f"=== Generating narration audio ===")
print(f"  Voice: {voice}")
print(f"  Slides: {len(slides)}")
print(f"  Words: {word_count}")

# --- Chunking ---
# The Gemini TTS model has a max output audio duration. At ~150 wpm, 800 words
# produces ~5.3 min of speech which is safely within the limit. For longer
# narrations, we split into chunks, generate audio per chunk, then concatenate.
MAX_WORDS_PER_CHUNK = 600

def build_prompt(segment_texts, start_index):
    """Build a TTS prompt for a subset of segments."""
    parts = [style, ""]
    for j, text in enumerate(segment_texts):
        parts.append(f"[{start_index + j + 1}]")
        parts.append(text)
        parts.append("")
    return "\n".join(parts)

def call_tts(prompt_text, label=""):
    """Make a single TTS API call and return raw PCM bytes."""
    print(f"  [tts] Calling {tts_model}{label}...")
    try:
        response = api_call(tts_endpoint, {
            "contents": [{"parts": [{"text": prompt_text}]}],
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

    error_msg = response.get("error", {}).get("message", "")
    if error_msg:
        print(f"  [error] TTS failed: {error_msg}")
        sys.exit(1)

    return base64.b64decode(response["candidates"][0]["content"]["parts"][0]["inlineData"]["data"])

def pcm_to_wav(pcm_bytes, out_wav):
    """Convert raw 24kHz PCM to 48kHz WAV with speed adjustment."""
    pcm_tmp = out_wav + ".pcm"
    with open(pcm_tmp, "wb") as f:
        f.write(pcm_bytes)
    subprocess.run([
        "ffmpeg", "-y", "-f", "s16le", "-ar", "24000", "-ac", "1",
        "-i", pcm_tmp, "-af", f"atempo={speed}", "-ar", "48000", out_wav
    ], capture_output=True, check=True)
    os.remove(pcm_tmp)

# --- Split slides into chunks by word count ---
chunks = []  # list of (start_index, [segment_texts])
current_chunk = []
current_words = 0
current_start = 0

for i, text in enumerate(slides):
    wc = len(text.split())
    if current_chunk and current_words + wc > MAX_WORDS_PER_CHUNK:
        chunks.append((current_start, current_chunk))
        current_start = i
        current_chunk = [text]
        current_words = wc
    else:
        current_chunk.append(text)
        current_words += wc
if current_chunk:
    chunks.append((current_start, current_chunk))

wav_path = os.path.join(output_dir, "full-narration.wav")

if len(chunks) == 1:
    # Single chunk — same as before
    prompt = build_prompt(slides, 0)
    pcm_data = call_tts(prompt)
    pcm_to_wav(pcm_data, wav_path)
else:
    # Multiple chunks — generate each, then concatenate
    print(f"  [tts] Narration is {word_count} words — splitting into {len(chunks)} chunks")
    chunk_wavs = []
    for ci, (start_idx, chunk_slides) in enumerate(chunks):
        chunk_wc = sum(len(s.split()) for s in chunk_slides)
        label = f" (chunk {ci + 1}/{len(chunks)}, segments {start_idx}-{start_idx + len(chunk_slides) - 1}, {chunk_wc} words)"
        prompt = build_prompt(chunk_slides, start_idx)
        pcm_data = call_tts(prompt, label)
        chunk_wav = os.path.join(output_dir, f"chunk-{ci:02d}.wav")
        pcm_to_wav(pcm_data, chunk_wav)
        chunk_wavs.append(chunk_wav)

    # Concatenate chunk WAVs
    concat_path = os.path.join(output_dir, "chunk-concat.txt")
    with open(concat_path, "w") as f:
        for cw in chunk_wavs:
            f.write(f"file '{cw}'\n")
    subprocess.run([
        "ffmpeg", "-y", "-f", "concat", "-safe", "0",
        "-i", concat_path, "-c", "copy", wav_path
    ], capture_output=True, check=True)

    # Clean up chunk files
    os.remove(concat_path)
    for cw in chunk_wavs:
        os.remove(cw)

# Get duration
dur_result = subprocess.run(
    ["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", wav_path],
    capture_output=True, text=True
)
total_dur = float(dur_result.stdout.strip())
print(f"  [done] full-narration.wav ({total_dur:.1f}s, {speed}x speed)")

# --- Duration sanity check ---
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

# Register cleanup so the remote file is deleted even on early exit
def _cleanup_uploaded_file():
    try:
        req = urllib.request.Request(
            f"{files_endpoint}/{file_id}?key={api_key}",
            method="DELETE",
        )
        urllib.request.urlopen(req)
    except Exception:
        pass
atexit.register(_cleanup_uploaded_file)

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

parsed = json.loads(align_text)

# Accept a bare list or an object with a list value (e.g. {"timestamps": [...]})
if isinstance(parsed, list):
    timestamps = parsed
elif isinstance(parsed, dict):
    # Use the first list-valued field
    timestamps = next((v for v in parsed.values() if isinstance(v, list)), None)
    if timestamps is None:
        print(f"  [error] Alignment returned object with no list field: {align_text[:200]}")
        sys.exit(1)
else:
    print(f"  [error] Unexpected alignment response type: {type(parsed).__name__}")
    sys.exit(1)

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

SPLIT_PAD = 0.4  # seconds to start before detected boundary to avoid clipping speech onset

for i in range(len(slides)):
    num = f"{i:02d}"
    raw_start = cut_points[i]
    # Pad earlier to avoid clipping the first syllable (alignment timestamps
    # can be slightly late). Don't pad before the previous segment's *padded* start,
    # and shorten the previous segment's end to match so clips never overlap.
    prev_start = cut_points[i - 1] if i > 0 else 0.0
    start = max(prev_start, raw_start - SPLIT_PAD) if i > 0 else raw_start
    raw_end = cut_points[i + 1] if i + 1 < len(cut_points) else end_time
    # Pull end back by SPLIT_PAD so the next segment's padded start doesn't
    # overlap with this segment's end.
    if i + 1 < len(cut_points):
        end = max(start, raw_end - SPLIT_PAD)
    else:
        end = raw_end
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
MAX_SILENCE = 0.15  # strip nearly all silence — segment title slides handle inter-slide pauses
SILENCE_THRESHOLD = "-40dB"
print()
print("=== Trimming silence ===")

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

    # Find trailing silence: silence that starts near the end and extends to clip end.
    # Skip trailing trim on last segment — it's followed by the outro and
    # the silence detector often clips the final word.
    trim_end = clip_dur
    is_last = (i == len(slides) - 1)
    if not is_last and silence_starts:
        last_silence_start = float(silence_starts[-1])
        # Verify this silence actually extends to the clip end (not an internal pause).
        # If there's a corresponding silence_end after last_silence_start that is before
        # clip_dur, this is an internal pause — skip it.
        last_silence_is_trailing = True
        for se in silence_ends:
            se_val = float(se)
            if se_val > last_silence_start and se_val < clip_dur - 0.05:
                last_silence_is_trailing = False
                break
        if last_silence_is_trailing and last_silence_start > 0.05:  # not the leading silence
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

print()
print("=== Done ===")
PYTHON_SCRIPT

echo ""
echo "Output:"
ls -la "${OUTPUT_DIR}"/audio-*.wav 2>/dev/null || echo "  (no files generated)"
