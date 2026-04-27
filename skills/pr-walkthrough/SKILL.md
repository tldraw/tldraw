---
name: pr-walkthrough
description: Create a narrated video walkthrough of a pull request with code slides and audio narration. Use when asked to create a PR walkthrough, PR video, or walkthrough video.
---

# PR walkthrough video

Create a narrated walkthrough video for a pull request. This is designed to be an internal artifact, providing the same benefit as would a loom video created by the pull request's author — walking through the code changes, explaining what was done and why, so that anyone watching can understand the PR quickly.

**Input:** A GitHub pull request URL (e.g., `https://github.com/tldraw/tldraw/pull/7924`). If given just a PR number or other description, assume that the PR is on the tldraw/tldraw repository.

**Output:** An MP4 video at 1280×720 (30 fps) with audio narration, whisper-timed yellow-on-black subtitles, and standardized intro / outro slides, saved to `out/pr-<number>-walkthrough.mp4`.

All intermediate files (audio, manifest, scripts) go in `tmp/pr-<number>/` relative to this skill directory. This directory is gitignored. Only the final `.mp4` lives at `out/`.

Run commands that reference `./scripts` or `./video` from this skill directory.

## Philosophy

**This is a walkthrough from the author's perspective.** The goal is the same as if the PR author sat down with someone and walked them through the changes — showing specific code, explaining what changed and why, in an order that builds understanding. The viewer should come away understanding both _what the code does_ and _how to think about the changes_.

This means:

- **The narration drives everything.** Write the walkthrough narration first, as a continuous explanation of the PR. Then figure out what should be on screen at each moment to support what's being said.
- **Show the code.** The default visual is a code diff or source file. Text slides are the exception (intro, brief transitions, outro), not the rule. When the narration talks about a function, the viewer should be looking at that function.
- **Walk through changes in a logical order**, not necessarily file order or commit order — but always anchored to concrete code, not abstract descriptions.
- **Explain the "why", not just the "what".** The code on screen shows what changed. The narration adds the reasoning — why this approach, what problem it solves, what edge cases it handles.

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

### Step 2: Write the narration

Write the narration as continuous text, broken into logical segments. Each segment is a beat of the walkthrough — a concept, a change, or a group of related changes. Save this as `tmp/pr-<number>/SCRIPT.md`.

The narration should read like the author explaining the PR to a colleague: "So here's what we're doing... The core problem was X... The approach I took was Y... If you look at this function here..."

Structure: intro → context/problem → code walkthrough → summary. See **Script structure** below.

If the commits are simple and organized well (often on a branch with `-clean` in its name), you can follow their commit messages and descriptions to guide your narration. Otherwise, examine the code and create your own narrative. Introduce concepts in an order that builds on previous ones.

Avoid redundancy, especially between intro and first content segment.

### Step 3: Generate audio and timestamps

Generate per-segment audio clips with one TTS call per segment. This avoids chunking, alignment, and splitting entirely — each segment is short enough for a single reliable TTS call.

Write a `narration.json` file, then run the `generate-audio.sh` CLI tool:

```bash
./scripts/generate-audio.sh narration.json tmp/pr-<number>/
```

**API key:** Sourced automatically from the repo `.env` file (`GEMINI_API_KEY`).

#### Narration JSON format

```json
{
	"style": "Read the following walkthrough narration in a calm, steady, professional tone. Speak at a measured pace as if the author of a pull request were walking a colleague through the code changes.",
	"voice": "Iapetus",
	"slides": [
		"This pull request adds group-aware binding resolution to the arrow tool...",
		"The core problem was that arrow bindings broke when the target shape...",
		"If you look at the getBindingTarget method in ArrowBindingUtil.ts..."
	]
}
```

- **`style`** — Voice persona and pacing instructions. Keep it short and specific.
- **`voice`** — Gemini voice name (default: `Iapetus`).
- **`slides`** — Array of narration text, one entry per segment.

#### How it works

1. For each segment, the script builds a prompt: style preamble + segment text.
2. One API call to `gemini-2.5-pro-tts` per segment generates a WAV clip directly.
3. Each clip is validated (duration sanity check vs word count) and retried automatically if the output is bad.
4. Leading/trailing silence is trimmed from each clip.

**Output:** Per-segment audio clips (`audio-00.wav`, ...) and a `durations.json` file mapping each audio filename to its duration in seconds.

**Dependencies:** ffmpeg / ffprobe. No Python packages required beyond the standard library.

**Do NOT use** `[pause long]` or `[pause medium]` markup tags in the narration text — the model may read them aloud literally.

### Step 4: Write the manifest

The manifest is a JSON file that describes every slide in the video. It bridges the narration/audio step and the hyperframes renderer.

Read the `durations.json` from step 3 to get the duration (in seconds) for each audio clip. Then write a `manifest.json` alongside the audio files:

```json
{
	"pr": 7865,
	"slides": [
		{
			"type": "intro",
			"title": "Fix canvas-in-front z-index layering #7865",
			"date": "February 14, 2026",
			"audio": "audio-00.wav",
			"durationInSeconds": 3.2
		},
		{
			"type": "diff",
			"filename": "packages/editor/editor.css",
			"language": "css",
			"diff": "@@ -12,7 +12,7 @@\n   --tl-z-canvas: 100;\n-  --tl-z-canvas-in-front: 600;\n+  --tl-z-canvas-in-front: 250;\n   --tl-z-shapes: 300;",
			"audio": "audio-01.wav",
			"durationInSeconds": 25.8
		},
		{
			"type": "code",
			"filename": "packages/editor/src/lib/Editor.ts",
			"language": "typescript",
			"code": "function getZIndex() {\n  return 250\n}",
			"audio": "audio-02.wav",
			"durationInSeconds": 13.5
		},
		{
			"type": "text",
			"title": "Summary",
			"subtitle": "Moved canvas-in-front from z-index 600 to 250.",
			"audio": "audio-07.wav",
			"durationInSeconds": 7.4
		},
		{
			"type": "list",
			"title": "Key changes",
			"items": ["Lowered z-index", "Updated tests", "Added migration"],
			"audio": "audio-06.wav",
			"durationInSeconds": 10.2
		},
		{
			"type": "outro",
			"durationInSeconds": 3
		}
	]
}
```

#### Slide types

| Type      | Required fields                                              | Description                        |
| --------- | ------------------------------------------------------------ | ---------------------------------- |
| `intro`   | `title`, `date`, `audio`, `durationInSeconds`                | Logo + title + date                |
| `diff`    | `filename`, `language`, `diff`, `audio`, `durationInSeconds` | Syntax-highlighted unified diff    |
| `code`    | `filename`, `language`, `code`, `audio`, `durationInSeconds` | Syntax-highlighted source code     |
| `text`    | `title`, `audio`, `durationInSeconds`                        | Title + optional `subtitle`        |
| `list`    | `title`, `items`, `audio`, `durationInSeconds`               | Title + numbered items             |
| `image`   | `src`, `audio`, `durationInSeconds`                          | Pre-rendered image (fallback)      |
| `segment` | `title`, `durationInSeconds`                                 | Silent title card between segments |
| `outro`   | `durationInSeconds`                                          | Logo only, no audio                |

#### Animated scroll with `focus`

For longer diffs or code (more than ~30 lines), the renderer keeps the font at a readable 16px and uses an animated viewport that scrolls between focus points. Add a `focus` array to `diff` or `code` slides:

```json
{
	"type": "diff",
	"filename": "packages/editor/src/lib/Editor.ts",
	"language": "typescript",
	"diff": "... 60-line diff ...",
	"focus": [
		{ "line": 3, "at": 0 },
		{ "line": 25, "at": 0.4 },
		{ "line": 50, "at": 0.8 }
	],
	"audio": "audio-03.wav",
	"durationInSeconds": 30
}
```

- **`line`** — The line number (0-indexed into the parsed diff/code lines) to center on screen.
- **`at`** — When to arrive at this position, as a fraction of the slide's duration (0 = start, 1 = end).

The viewport smoothly eases between focus points. Before the first point, it holds at the first position; after the last, it holds there.

**When to use focus:** Any diff or code slide with more than ~30 lines. Without focus, long content starts at the top and stays static — the viewer can't see the bottom. With focus, you guide the viewer's eye to the code being discussed at each moment.

**When to omit focus:** Short diffs (≤30 lines) fit on screen at 16px and don't need scrolling.

#### Writing diff fields

For `diff` slides, paste the **unified diff** for the relevant hunk(s). This is the output of `git diff` for that section of the file — including the `@@` hunk header and `+`/`-`/` ` line prefixes. The renderer parses these prefixes to apply green/red backgrounds and syntax highlighting.

To get a diff for a specific file:

```bash
git diff main..HEAD -- path/to/file.ts
```

Include only the relevant hunks, not the entire file diff. Strip the `diff --git` and `---`/`+++` header lines — start from the `@@` hunk header.

For `code` slides, paste the relevant source code (a function, a class, a section). No diff prefixes needed.

#### Segment title slides

Insert a **`segment` slide** before each content segment to introduce it — except before the intro and context/overview segments. This includes code walkthrough segments and the summary/conclusion. Each segment slide is **3 seconds of silence** with the segment title centered on screen.

```json
{
	"type": "segment",
	"title": "Zoom state machine",
	"durationInSeconds": 3
}
```

These provide clear visual breaks between sections and give the viewer a moment to orient before each new topic.

#### Segment title labels on code/diff slides

Add a `title` field to `code` and `diff` slides to show a small label in the top-left corner identifying which segment the viewer is in. Use the same title as the preceding `segment` slide. This helps orient viewers, especially when a segment spans multiple slides.

```json
{
	"type": "diff",
	"title": "Zoom state machine",
	"filename": "packages/editor/src/lib/ZoomTool.ts",
	...
}
```

### Step 5: Render the video

Run the `render.sh` script:

```bash
./video/render.sh \
  tmp/pr-<number>/manifest.json \
  out/pr-<number>-walkthrough.mp4
```

The script:

1. Copies referenced audio/image files into `video/assets/`.
2. Runs whisper transcription on each audio file → `video/transcripts/audio-NN.json` (idempotent — only re-transcribes if the audio is newer than the existing transcript).
3. Runs `build.mjs <manifest>` to generate `video/index.html` — a hyperframes composition with timed clips for every slide, GSAP timeline for transitions and code-focus pans, and yellow-on-black caption clips with start/end times derived from the whisper transcripts.
4. Lints the composition and renders 1920×1080 frames via `npx hyperframes render`.
5. Downscales to 1280×720 / 30fps and recompresses with ffmpeg (CRF 26 + AAC 96k) for the final small-but-sharp MP4.

**Dependencies:** Node.js 22+, ffmpeg, Python 3 (used by `render.sh` to parse the manifest). `hyperframes` is invoked via `npx --yes`, so no install step. Whisper runs locally (small.en model, ~150MB on first download).

#### Caption sync via whisper

Captions appear as yellow text on a solid black pill, anchored to the bottom of the frame. Their start/end times come from word-level whisper transcripts grouped into 5–7 word chunks, breaking early on natural pauses (>450ms gaps = sentence boundaries). One implication: whisper transcribes brand/code names phonetically — "tldraw" → "TL Draw", "OverlayUtil" → "overlay util". This is acceptable for captions but could be normalized later via a substitution table in `build.mjs`.

#### File size knobs

The default render targets ~30–60 MB for an 8-minute video. To tune:

- `--crf <n>` in the ffmpeg downscale step inside `render.sh` — 22 is near-lossless, 26 is the default, 30+ is much smaller. CRF 28–30 is a good range for a docs-quality result.
- The 1080p hyperframes render uses `-q draft --crf 30` to keep the intermediate file small (the downscale dominates final size anyway).

## File organization

Final output lives in this skill directory. All intermediate files go in `tmp/` (gitignored):

```
pr-walkthrough/
├── SKILL.md                    # This file
├── scripts/                    # CLI tools (checked in)
│   └── generate-audio.sh       # narration.json → per-slide WAVs + durations.json
├── video/                      # Hyperframes project (checked in)
│   ├── hyperframes.json        # hyperframes config
│   ├── meta.json               # project meta
│   ├── build.mjs               # manifest.json → index.html composition
│   ├── render.sh               # manifest.json → 720p MP4 (full pipeline)
│   ├── assets/                 # Auto-populated at render time (gitignored)
│   ├── transcripts/            # Whisper word-level JSON (gitignored, cached)
│   └── renders/                # Intermediate 1080p renders (gitignored)
├── out/                        # Final outputs (gitignored)
│   └── pr-XXXX-walkthrough.mp4
└── tmp/                        # Intermediate files (gitignored)
    └── pr-XXXX/
        ├── SCRIPT.md           # Narration script
        ├── narration.json      # Input to generate-audio.sh
        ├── durations.json      # Audio filename → duration in seconds
        ├── manifest.json       # Input to render.sh
        └── audio-XX.wav        # Per-segment audio clips
```

## API configuration

- **Gemini API key:** Stored as `GEMINI_API_KEY` in the project root `.env` file. Used for TTS and audio alignment.
- **TTS model:** `gemini-2.5-pro-tts`
- **TTS voice:** `Iapetus` (always)

## Script structure

The walkthrough follows a consistent narrative arc. Not every section needs its own segment — combine or skip sections based on the PR's complexity. The goal is 8-12 segments total, with the vast majority showing code.

### Intro (1 segment)

The intro card: tldraw logo + PR title + date. The narration should be a single sentence that frames what this PR does at a high level. Don't go into detail yet.

Manifest slide type: `intro`.

### Context (0-1 segments)

Brief orientation before diving into code. What was the situation before this PR? What problem or need motivated the work? Keep this short — just enough framing that the code walkthrough makes sense.

- Be concrete: "Arrow bindings broke when the target shape was inside a group" not "There were issues with bindings"
- Name the area of the codebase affected

If the context can be explained while showing the first piece of relevant code, skip the standalone context segment and fold it into the first code segment.

Manifest slide type: `text` or `diff` (if showing the problematic code).

### Code walkthrough (6-10 segments)

The bulk of the video. Walk through the actual code changes, showing specific diffs and files while explaining what was done and why.

**Every segment should show code.** Use `diff` slides for changes and `code` slides for unchanged reference code.

Guidelines:

- **Name files and functions.** Every narrated segment should reference at least one specific file or function.
- **Show the diff.** The visual for each segment should be the actual diff being discussed. Use `git diff main..HEAD -- path/to/file` to get the diff, then extract the relevant hunks.
- **Order by understanding, not by file.** Present changes in the order that builds comprehension. If a new type is defined in one file and consumed in another, show the definition first.
- **Explain the "why", not just the "what".** The diff shows _what_ changed — the narration adds the reasoning, the edge cases it handles, the alternatives that were considered.
- **Skip boilerplate, but mention it.** Don't dedicate a segment to every import change or type export, but do mention in passing: "There are also some type exports added in `index.ts` — those are just re-exports of the new types we'll see next."
- **Group related small changes.** If three files all got the same one-line fix, one segment can cover all three. Mention each file by name.

### Summary (1 segment)

Briefly recap what the PR accomplished. This is a short wrap-up — a sentence or two summarizing the overall change, mentioning any known limitations or follow-up work if relevant.

Manifest slide type: `text`.

### Outro (1 segment, silent)

The tldraw logo, 3 seconds of silence. Always include this as the final slide.

Manifest slide type: `outro` with `durationInSeconds: 3`.

## Narration writing tips

- **Be specific about code.** Say "In `BindingUtil.ts`, the `onAfterChange` handler now checks for group ancestors" — not "The binding system was updated." Name files and functions so the viewer can connect the narration to what's on screen.
- **Each segment = one change or closely related group of changes.** If you can't point to a specific diff for the segment, it's probably too abstract.
- **Write as the author.** The tone should be explanatory and natural — like walking someone through your work. "So the main thing here is..." or "The tricky part was..." are fine.
- **Avoid redundancy** between intro and first content segment.
- **Mention files that aren't shown.** If a PR touches 15 files but only 6 are interesting, briefly acknowledge the others: "The remaining changes are type exports and test fixtures."
- Aim for **5-7 minutes** total narration.

## Checklist

- [ ] Read all PR commits and understand the full diff
- [ ] Write narration in SCRIPT.md (8-12 segments)
- [ ] Generate per-segment audio (Iapetus voice)
- [ ] Read durations.json to get per-segment durations
- [ ] Write manifest.json with slide types, diffs/code, and audio references
- [ ] Render video with render.sh
- [ ] Verify final output: 1280×720 / 30 fps, audio synced, captions readable, outro present
