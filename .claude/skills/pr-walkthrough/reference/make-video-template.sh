#!/bin/bash
# Template for assembling the walkthrough video from per-slide audio and screenshots.
# Copy this to pr-walkthrough/tmp/make-video.sh and adjust the slide count.
set -euo pipefail

cd "$(dirname "$0")"

# --- Configuration ---
# Set LAST_NARRATED_SLIDE to the number of the last slide with audio (0-indexed)
LAST_NARRATED_SLIDE=10
# Set OUTRO_SLIDE to the slide number of the silent outro
OUTRO_SLIDE=11
# Set OUTRO_DURATION to the length of the silent outro in seconds
OUTRO_DURATION=3
# Set OUTPUT to the desired output filename
OUTPUT="pr-XXXX-walkthrough.mp4"

SCALE="scale=1600:900:force_original_aspect_ratio=decrease:flags=lanczos,pad=1600:900:(ow-iw)/2:(oh-ih)/2:white"

echo "=== Building walkthrough video ==="

# Step 1: Concatenate all audio into one file
echo "[1/3] Concatenating audio..."
rm -f concat-audio.txt full-audio.wav
for i in $(seq -f "%02g" 0 $LAST_NARRATED_SLIDE); do
  echo "file 'audio-${i}.wav'" >> concat-audio.txt
done
ffmpeg -y -f concat -safe 0 -i concat-audio.txt -c copy full-audio.wav 2>/dev/null

TOTAL_DUR=$(ffprobe -v error -show_entries format=duration -of csv=p=0 full-audio.wav)
echo "  Total audio duration: ${TOTAL_DUR}s"

# Step 2: Create per-slide video segments
echo "[2/3] Creating slide video segments..."
rm -f concat-video.txt
CUMULATIVE=0

for i in $(seq -f "%02g" 0 $LAST_NARRATED_SLIDE); do
  DUR=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "audio-${i}.wav")
  echo "  Slide ${i}: ${DUR}s (starts at ${CUMULATIVE}s)"

  ffmpeg -y -loop 1 -i "slide-${i}.png" -c:v libx264 -tune stillimage -pix_fmt yuv420p -t "$DUR" \
    -vf "$SCALE" -r 30 -an \
    "segment-${i}.mp4" 2>/dev/null

  echo "file 'segment-${i}.mp4'" >> concat-video.txt
  CUMULATIVE=$(python3 -c "print(round(${CUMULATIVE} + ${DUR}, 3))")
done

# Add silent outro
OUTRO_NUM=$(printf "%02d" $OUTRO_SLIDE)
echo "  Slide ${OUTRO_NUM} (outro): ${OUTRO_DURATION}s silent"
ffmpeg -y -loop 1 -i "slide-${OUTRO_NUM}.png" -c:v libx264 -tune stillimage -pix_fmt yuv420p -t $OUTRO_DURATION \
  -vf "$SCALE" -r 30 -an \
  "segment-${OUTRO_NUM}.mp4" 2>/dev/null
echo "file 'segment-${OUTRO_NUM}.mp4'" >> concat-video.txt

# Step 3: Concatenate and mux
echo "[3/3] Assembling final video..."
ffmpeg -y -f concat -safe 0 -i concat-video.txt -c copy silent-video.mp4 2>/dev/null

# Pad audio with silence to cover the outro segment.
# Do NOT use -shortest — it would trim the silent outro.
VIDEO_DURATION=$(ffprobe -v error -show_entries format=duration -of csv=p=0 silent-video.mp4)
echo "  Audio: ${TOTAL_DUR}s, Video: ${VIDEO_DURATION}s"
ffmpeg -y -i full-audio.wav -af "apad" -t "$VIDEO_DURATION" padded-audio.wav 2>/dev/null

ffmpeg -y -i silent-video.mp4 -i padded-audio.wav \
  -c:v copy -c:a aac -b:a 192k \
  "$OUTPUT" 2>/dev/null

# Cleanup
rm -f concat-audio.txt concat-video.txt full-audio.wav padded-audio.wav silent-video.mp4
rm -f segment-*.mp4

# Report
FINAL_DUR=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$OUTPUT")
DIMS=$(ffprobe -v error -show_entries stream=width,height -of csv=p=0 -select_streams v:0 "$OUTPUT")
echo ""
echo "=== Done! ==="
echo "Output: $(pwd)/${OUTPUT}"
echo "Size: $(du -h "$OUTPUT" | cut -f1)"
echo "Duration: $(python3 -c "m=int(float('${FINAL_DUR}'))//60; s=int(float('${FINAL_DUR}'))%60; print(f'{m}:{s:02d}')")"
echo "Resolution: ${DIMS}"
