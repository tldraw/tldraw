---
name: before-and-after-video
description: Create a polished before/after product demo video from recorded UI interactions, especially for pull requests that compare an older app version with a new implementation. Use when asked to make a before-and-after video, screen interaction demo, PR demo video, old-vs-new editor comparison, or a video with before/after footer labels and descriptive captions.
---

# Before/after video

## Overview

Produce a short MP4 that runs the same workflow against two builds back-to-back: an older `Before` build, then a newer `After` build. Prefer recorded interactions over static screenshots whenever the change is about behavior.

The default output is 1280x720 at 30fps. Each section fills the frame edge-to-edge: the recording occupies the top `height - footerH` pixels and a dark footer band sits flush along the bottom, containing a colored dot (red for `Before`, green for `After`), a status label, and a short caption that can change over time. Text is set in Geist; status and caption are the same size so they share a baseline. No title or end cards unless the user asks for them.

Source of truth for behavior:
- `scripts/compose-before-after.mjs` — composes the final video from two recordings.
- `scripts/cursor-helpers.mjs` — installs a visible synthetic cursor and exposes movement, click, drag, and timing helpers.
- `assets/Geist.ttf` — bundled UI font used for all footer typography. Override with `fontFile` in the config to use a different `.ttf`/`.otf`.

## Prerequisites

- `ffmpeg` and `ffprobe` on `PATH` (the composer shells out to both).
- Playwright with Chromium installed. The repo already depends on `@playwright/test`; if Chromium is missing, run `yarn playwright install chromium` once.
- For the `Before` recording, a reachable older deployment (for tldraw, `https://examples-canary.tldraw.com/...`) or a separate locally running older build.
- For the `After` recording, the current branch running locally (`yarn dev` → `http://localhost:5420/...`).

## Workflow

1. Pick a slug for the demo, for example `page-menu`. All working files live under `tmp/<slug>/` and the final video lands at `out/<slug>.mp4` (both are gitignored at the skill root).

2. Pick the comparison targets.
   - `Before`: live older build URL, or an explicit older commit served locally.
   - `After`: current local dev server.
   - Keep viewport size, color scheme, animation speed, seed data, and the starting frame of the canvas identical across both.

3. Write two recorder scripts: `tmp/<slug>/record-before.mjs` and `tmp/<slug>/record-after.mjs`. Each one launches Chromium, navigates, seeds state, installs the synthetic cursor, performs the interaction, and renames the recorded `.webm` to a stable name. See [Recording template](#recording-template).

4. Run the recorders:
   ```bash
   node skills/before-and-after-video/tmp/<slug>/record-before.mjs
   node skills/before-and-after-video/tmp/<slug>/record-after.mjs
   ```
   `.mjs` runs under plain `node`; no bundler step is needed.

5. Write `tmp/<slug>/video.json` describing the two sections, any captions, and the right `cropAnchor` for where the UI being demoed lives in the frame (`"top"` for header/menu UI, `"bottom"` for the floating toolbar, `"center"` for canvas-focused work). See [Composition config](#composition-config).

6. Compose the final video:
   ```bash
   node skills/before-and-after-video/scripts/compose-before-after.mjs skills/before-and-after-video/tmp/<slug>/video.json
   ```
   The composer prints the absolute path of the output.

7. Verify and hand off. See [Verification](#verification). When the user wants to watch it, `open out/<slug>.mp4` from the skill directory.

If the video is going to be embedded inside another timeline-rendered composition (such as a `video` slide in a [`pr-walkthrough`](../pr-walkthrough/SKILL.md)), the consumer scrubs `currentTime` per frame. The default x264 keyframe spacing (~8s) is too coarse for that; re-encode with denser GOP first, e.g. `ffmpeg -i out/<slug>.mp4 -c:v libx264 -crf 22 -g 1 -keyint_min 1 -pix_fmt yuv420p -movflags +faststart out/<slug>-seekable.mp4`.

## Recording template

Save as `tmp/<slug>/record-before.mjs` (and an analogous `record-after.mjs` with the new build's URL and `screen-after.webm`):

```js
import { chromium } from '@playwright/test'
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createCursorController } from '../../scripts/cursor-helpers.mjs'

const here = path.dirname(fileURLToPath(import.meta.url))
const outDir = here
const videoDir = path.join(outDir, 'raw-before-video')
await fs.rm(videoDir, { recursive: true, force: true })
await fs.mkdir(videoDir, { recursive: true })

const browser = await chromium.launch({ headless: true })
const context = await browser.newContext({
	viewport: { width: 1280, height: 720 },
	deviceScaleFactor: 1,
	recordVideo: { dir: videoDir, size: { width: 1280, height: 720 } },
})
const page = await context.newPage()
const cursor = createCursorController(page)

await page.goto('https://examples-canary.tldraw.com/end-to-end', {
	waitUntil: 'domcontentloaded',
	timeout: 60_000,
})
await page.waitForSelector('.tl-canvas', { timeout: 60_000 })

// Stabilize the recording. Animations off, light theme, and any deterministic seed data.
await page.evaluate(() => {
	const editor = /** @type {any} */ (globalThis).editor
	editor.user.updateUserPreferences({ animationSpeed: 0, colorScheme: 'light' })
})

await cursor.install()
await cursor.sleep(900)

const button = page.getByTestId('page-menu.button')
const { x, y } = await cursor.center(button)
await cursor.clickAt(x, y)

const video = page.video()
await page.close()
await context.close()
await browser.close()

const rawPath = await video.path()
await fs.rename(rawPath, path.join(outDir, 'screen-before.webm'))
```

### Cursor helpers

`createCursorController(page, options?)` returns:

- `install()` — injects the on-page cursor element; call after `page.goto` and any initial waits.
- `moveTo(x, y, opts?)` — eased, slightly curved movement. `opts` accepts `{ duration, steps, curve, down }`.
- `clickAt(x, y)` — moves, presses, releases, with natural dwell time on either side.
- `doubleClickAt(x, y)` — same shape, with a double click.
- `drag(from, to, steps?)` — press at `from`, glide to `to`, release.
- `center(locator)` — returns `{ x, y, box }` for a Playwright locator's bounding box.
- `sleep(ms)` — convenience timer for deliberate pauses.

Use `cursor.sleep` to insert beats before and after clicks so the viewer can register what is happening; the helpers already add small dwells but a hero moment benefits from another ~400–900ms.

### Keeping the recording readable

- One feature or workflow per video. Resist showing more.
- Match page names, document contents, and step order across the two recordings even when the old build needs extra steps (mode toggles, modal dismissals) to reach the equivalent state.
- Never overlay labels on top of the app — captions go in the footer.
- Prefer Playwright locators (`getByTestId`, `getByRole`) over coordinate clicks so renames in the new build are caught early.

## Composition config

Minimum required fields are `output` and `sections` (exactly two). Everything else has defaults that match the visual standards.

```json
{
	"output": "out/page-menu.mp4",
	"width": 1280,
	"height": 720,
	"fps": 30,
	"crf": 22,
	"cropAnchor": "top",
	"footerH": 56,
	"footer": "#0f1115",
	"footerTextColor": "#ffffff",
	"textSize": 19,
	"dotSize": 12,
	"audio": "tmp/page-menu/audio.wav",
	"audioTempo": 1,
	"sections": [
		{
			"type": "before",
			"video": "tmp/page-menu/screen-before.webm",
			"status": "Before",
			"markerColor": "#df4038",
			"footerText": "Older interaction model",
			"labels": [
				{ "from": 0, "to": 5.5, "text": "Open the menu in the older editor" },
				{ "from": 5.5, "to": 12, "text": "Toggle edit mode before reordering" }
			]
		},
		{
			"type": "after",
			"video": "tmp/page-menu/screen-after.webm",
			"status": "After",
			"markerColor": "#5dbb63",
			"footerText": "Redesigned, direct interaction",
			"labels": [
				{ "from": 0, "to": 6, "text": "Open the redesigned menu" },
				{ "from": 6, "to": 14, "text": "Reorder and rename directly" }
			]
		}
	]
}
```

Notes:
- All relative paths in the config resolve from the config file's directory, not the CWD.
- `status` and `markerColor` are optional. Section `type` (`"before"` or `"after"`) picks sensible defaults (red `#df4038` / green `#5dbb63`).
- `cropAnchor` controls where the recording is sampled when the source aspect differs from the media area. `"top"` for UI-at-top (menus, toolbars in the header), `"bottom"` for UI-at-bottom (the floating tldraw toolbar), `"center"` (default) for canvas-focused work. Settable per-section too.
- `labels` time ranges are in seconds within the section. Make sure the last `to` covers the tail of the recording; otherwise the footer caption disappears before the video ends.
- If you have no per-moment captions, leave `labels` out and `footerText` is shown for the whole section.
- `audio` is optional. When present, it is concatenated across both sections and padded with silence (`apad`) so it never cuts the video short. Use `audioTempo` (typical range 0.9–1.1) to stretch narration slightly to fit.
- `fontFile` (not shown above) overrides the bundled Geist. Pass an absolute path or one relative to the config file.

## Visual standards

- Edge-to-edge media. No outer borders, card, or letterbox bars.
- Dark footer band (`#0f1115`) with all text in white. The only colored element in the footer is the dot.
- Red dot for `Before`, green for `After`. Do not swap.
- Status and caption use the same font size and the same baseline (`textSize`, default 19). Hierarchy comes from the colored dot, not from size or color contrast.
- Footer captions are short enough to scan at a glance — a few words per beat.
- Pick a `cropAnchor` that matches where the UI being demoed lives in the frame (top, center, or bottom). Don't accept a center-cropped recording that lops off the very feature you're showing.
- Default to sequential `Before` then `After`. Side-by-side only when the user explicitly asks for it.
- Never put labels inside the app frame.

## Verification

After the composer prints the output path, confirm the result:

```bash
ffprobe -v error -select_streams v:0 \
  -show_entries stream=width,height,r_frame_rate,duration \
  -of default=noprint_wrappers=1 out/<slug>.mp4

# Only if the config included audio:
ffprobe -v error -select_streams a:0 \
  -show_entries stream=codec_name,sample_rate,channels,duration \
  -of default=noprint_wrappers=1 out/<slug>.mp4
```

Sample several frames across both sections and inspect them with the Read tool:

```bash
mkdir -p tmp/<slug>/verify
ffmpeg -loglevel error -y -ss 2  -i out/<slug>.mp4 -frames:v 1 tmp/<slug>/verify/frame-02.png
ffmpeg -loglevel error -y -ss 12 -i out/<slug>.mp4 -frames:v 1 tmp/<slug>/verify/frame-12.png
ffmpeg -loglevel error -y -ss 24 -i out/<slug>.mp4 -frames:v 1 tmp/<slug>/verify/frame-24.png
```

What to check in the frames:
- 1280x720, 30fps, expected total duration.
- Media fills edge-to-edge — no light bars or unintended cropping of the UI being demoed.
- The dot is a clean, round, anti-aliased circle (not a square, not a Unicode bullet), and its color matches the section.
- Status text reads `Before` or `After` correctly and shares a baseline with the caption text.
- Footer caption is the one expected for that timestamp.
- Synthetic cursor is on-screen and over the element it is about to interact with.

## Common pitfalls

- **`editor` is not defined.** The seeded state block runs inside the page, not Node. Access it as `globalThis.editor` (or `window.editor`) — declaring it as a plain global produces a Playwright eval error.
- **Recording is black or 1280x720 of empty page.** `cursor.install()` ran before the app mounted. Wait on a concrete app selector (`.tl-canvas` for tldraw) before installing the cursor.
- **Captions get cut off.** A `labels` range ends before its section does. Either extend the final `to` past the section's duration or fall back to `footerText`.
- **Final video is shorter than the audio.** Expected: the composer uses `-shortest`, so the trailing audio is trimmed. If you need the full narration, trim or `audioTempo` the audio file to match the combined recording duration.
- **Old build looks different in unrelated ways** (different theme, different example seed). Match `colorScheme`, `animationSpeed`, and any seed data in both recorders — diffs unrelated to the change distract from it.
- **Sections are different lengths.** Acceptable, and usually informative (the new flow is faster). Only re-record if the disparity is from idle waiting, not from real interaction differences.
- **Top of the UI is clipped.** The composer crops the recording to fit the media area (which is shorter than 720 because of the footer). Set `cropAnchor: "top"` for menus and headers; `"bottom"` for the floating toolbar. The default `"center"` keeps the canvas centered at the cost of a small bite from both edges.
