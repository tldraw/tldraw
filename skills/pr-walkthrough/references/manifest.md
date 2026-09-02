# Manifest format

The manifest is a JSON file describing every slide in the video. It bridges the narration/audio step and the hyperframes renderer. Referenced from step 4 of `../SKILL.md`.


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
