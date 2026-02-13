---
name: pr-walkthrough
description: Create a narrated video walkthrough of a pull request with code slides and audio narration. Use when asked to create a PR walkthrough, PR video, or walkthrough video.
argument-hint: <pr-url>
disable-model-invocation: true
---

# PR walkthrough video

Create a narrated walkthrough video for a pull request. The output is an MP4 at 1600x900 with per-slide audio narration.

**Input:** A GitHub PR URL (e.g., `https://github.com/tldraw/tldraw/pull/7924`)

**Output:** `pr-walkthrough/pr-<number>-walkthrough.mp4`

## Philosophy

**The narration drives the visuals, not the other way around.** Write the story first, generate the audio, then create visuals that support each beat. This means:

- Fewer, more intentional slides (8-12, not one per diff hunk)
- Each slide illustrates one idea, not one code change
- Focus on the story: what problem, what approach, what are the key mechanisms

## Workflow

### Step 1: Understand the PR

Read the PR commits, diff, and description. Understand the narrative arc:
- What problem does this solve?
- What's the approach?
- What are the key mechanisms?

```bash
gh pr view <number> --json title,body,commits
git log main..HEAD --oneline
git diff main..HEAD --stat
```

### Step 2: Write the script

Write `pr-walkthrough/SCRIPT.md` — 8-12 slides, each with:
- **Visual description** (what the slide shows)
- **Narration** (one paragraph per slide)

Structure the story: intro → problem → approach → key mechanisms → wrap-up.

Avoid redundancy between intro and first content slide.

### Step 3: Generate per-slide audio

Generate audio **per slide** using Gemini TTS. This gives you exact per-slide durations and eliminates the need for timestamp detection.

Use the `pr-walkthrough/generate-audio.sh` script pattern:
- Voice: **Iapetus** (always)
- API: Gemini 2.5 Flash Preview TTS
- Output: one WAV file per slide (`audio-00.wav`, `audio-01.wav`, etc.)

See [generate-audio.sh reference](reference/generate-audio-template.sh) for the TTS function.

**Do NOT use** `[pause long]` or `[pause medium]` markup tags — the model reads them aloud literally.

### Step 4: Create visuals while audio generates

Two types of slides:

#### Text slides (custom HTML)
Use for: intro card, problem statement, approach overview, wrap-up, silent outro.

- Render as HTML at 1600x900, screenshot with Chrome DevTools MCP
- Use the intro.html pattern for the intro card (tldraw logo + PR title)
- Font sizes: h1 at 52px, h2 at 32px, body steps at 28px, detail text at 22px
- Always include a 3-second silent outro slide (logo only, no title)

See [text slide template](reference/text-slide-template.html) for the base CSS.

#### Code slides (GitHub screenshots)
Use for: all code/diff slides. **Prefer these over rendered HTML for code.**

Navigate to each commit on GitHub and screenshot the relevant diff sections:

```js
// Run via Chrome DevTools evaluate_script on each commit page:

// 1. Force light mode
document.documentElement.setAttribute('data-color-mode', 'light');
document.documentElement.setAttribute('data-light-theme', 'light');
document.documentElement.setAttribute('data-dark-theme', 'light');

// 2. Hide chrome
document.querySelector('[role="banner"]')?.style.display = 'none';
document.querySelector('nav[aria-label="Repository"]')?.style.display = 'none';

// 3. Expand all collapsed diff sections
document.querySelectorAll('button[aria-label*="Expand"]').forEach(btn => btn.click());

// 4. Hide file tree sidebar
document.querySelectorAll('.Layout-sidebar, .file-tree-toggle-wrapper')
  .forEach(el => el.style.display = 'none');
document.querySelector('[aria-label="Draggable pane splitter"]')?.style.display = 'none';

// 5. Scroll to target code
const rows = document.querySelectorAll('tr');
for (const row of rows) {
  if (row.textContent?.includes('TARGET_TEXT')) {
    row.scrollIntoView({ block: 'start' });
    window.scrollBy(0, -60); // offset for sticky header
    break;
  }
}
```

Note: `blob-code-inner` selectors don't reliably find text — search `tr` textContent instead.

Do NOT use CSS zoom on GitHub pages — it makes text blurry.

### Step 5: Assemble the video

Use the `pr-walkthrough/make-video.sh` script pattern:

1. Concatenate per-slide WAV files into `full-audio.wav`
2. Create per-slide video segments using each audio file's duration as the segment length
3. Add a 3-second silent outro segment (logo slide)
4. Concatenate all video segments
5. Mux with audio — do **NOT** use `-shortest` (it would trim the silent outro)

```bash
# Per-slide segment
ffmpeg -y -loop 1 -i "slide-XX.png" -c:v libx264 -tune stillimage \
  -pix_fmt yuv420p -t "$DURATION" \
  -vf "scale=1600:900:force_original_aspect_ratio=decrease:flags=lanczos,pad=1600:900:(ow-iw)/2:(oh-ih)/2:white" \
  -r 30 -an "segment-XX.mp4"

# Final mux (no -shortest!)
ffmpeg -y -i silent-video.mp4 -i full-audio.wav \
  -c:v copy -c:a aac -b:a 192k \
  output.mp4
```

## File organization

All walkthrough assets go in `pr-walkthrough/`:

```
pr-walkthrough/
├── SCRIPT.md              # Narration script
├── generate-audio.sh      # TTS generation script
├── make-video.sh          # Video assembly script
├── intro.html             # Intro card template
├── outro.html             # Outro card (logo only)
├── tldraw.svg             # Logo
├── audio-XX.wav           # Per-slide audio files
├── slide-XX.png           # Per-slide screenshots
└── pr-XXXX-walkthrough.mp4  # Final output
```

## GCloud / API configuration

- **Gemini API key:** Use `GEMINI_API_KEY` env var or the default in generate-audio.sh
- **TTS model:** `gemini-2.5-flash-preview-tts`
- **TTS voice:** `Iapetus` (always)

## Script writing tips

- Focus on the **story**, not line-by-line code description
- Structure: problem → approach → key mechanisms → how they connect
- Each slide = one idea. If you can't summarize the slide's point in one sentence, split or cut it.
- Avoid redundancy between intro and first content slide
- Aim for 5-7 minutes total narration
- Use double paragraph breaks between slide narrations for natural pauses

## Checklist

- [ ] Read all PR commits and understand the full diff
- [ ] Write SCRIPT.md with 8-12 slides
- [ ] Generate per-slide audio (Iapetus voice)
- [ ] Create text slides for non-code content (intro, problem, approach, wrap-up, outro)
- [ ] Screenshot GitHub diffs for code slides (light mode, no header, expanded hunks)
- [ ] Spot-check 2-3 screenshots for readability
- [ ] Assemble video with ffmpeg
- [ ] Verify final output: 1600x900, audio synced, outro present
