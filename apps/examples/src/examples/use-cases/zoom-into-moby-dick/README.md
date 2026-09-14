---
title: Zoom into Moby Dick
component: ./ZoomIntoMobyDickExample.tsx
priority: 2
keywords:
  [
    semantic zoom,
    level of detail,
    lod,
    camera,
    zoom steps,
    text,
    reading,
    summary,
    deep zoom,
    treemap,
  ]
---

Semantic zoom over a whole novel: one sentence zooms out to the whole book and in to Melville's own text.

---

Fully zoomed out, the canvas holds a single sentence summarising _Moby Dick_. Zoom in and it becomes a
paragraph, then a page, then a chapter-by-chapter outline, then the opening of a chapter, then the book
itself — about 208,000 words of it. Zooming into one corner of the paragraph opens that part of the story
rather than the next level of the book as a whole.

### The tree does the work

The obvious implementation reads `editor.getZoomLevel()` and swaps a shape's text. That can't give you
the second half of the behaviour, because there is no "this" to zoom into.

Instead the work is a tree, and every node's children subdivide its rectangle. The root sentence owns a
1000-unit square; its six children each own part of that square; their children own parts of those, down
to 136 chapters. Drilling into a passage then falls out for free, because the passage's children are
simply the nodes that grow first when you zoom there.

Cells tile their parent **exactly**, and the breathing room between them is taken inside each cell rather
than between them. Gaps would be self-similar: aim at one and you fall through every level at once,
landing on blank canvas with nothing to read and no way to tell where you are.

### The map is the book

Cell area is proportional to how much of Melville is inside it, so the layout shows the novel's real
pacing — the long anatomical digressions swelling in the middle, the three Chase chapters as solid
blocks at the end, "Midnight Aloft" as a sliver.

Not _exactly_ proportional, though. The longest chapter is 183 times the shortest, and because font size
goes as the square root of area, mapping that straight through would spread one level's type over a 13x
range: some cards would still be specks while their neighbours were already unreadable, and the level
would stop arriving all at once. Compressing the weights to `area ∝ length^0.35` keeps areas varying
about 7x while holding type to 2.4x.

| exponent            | cell area spread | type spread |
| ------------------- | ---------------- | ----------- |
| 0 (all cells equal) | 1.1x             | 1.23x       |
| 0.35 (used here)    | 6.7x             | 2.41x       |
| 1 (true proportion) | 187x             | 12.71x      |

### Handing off between levels

A level takes over when its **parent's** text has grown to `HANDOFF_PX` on screen, and hands on when its
own text reaches that same size. Because both sides of a handoff are the same zoom, one level is always
leaving exactly as the next arrives.

Deriving the entry from the parent rather than from the level itself matters more than it looks. Running
a level until its _child_ became readable let a level whose child is much denser grow without bound — the
chapter summaries reached 110px before the full text took over, most of an octave in which nothing
happened but text getting larger. Giving entry and exit independent pixel thresholds capped the size but
pulled the two boundaries apart, so the book sentence and the act summaries sat on top of one another at
full strength instead of crossfading.

The jump from a chapter summary to 8,000 characters of Melville is still the widest gap in the range, so
an **excerpt level** sits between them, holding the chapter's opening paragraphs. Its length isn't
guessed: it is the geometric mean of the summary and the full text, which is the length that splits one
chasm into two equal steps.

### Finding your way

Zooming by hand is not the only way in, and for most visitors it isn't the first.

- **Guided tour** flies down through every level once and then hands back control. Any wheel or pointer
  input cancels it immediately.
- **Clicking any passage** frames it, which reveals its children — but only while the select tool is
  active. Pick up the draw tool and the layer stops taking pointer events, so the whole book stays a
  surface you can annotate.
- **The breadcrumb** names where you are and zooms back out to any ancestor. It stops at the level you
  are actually reading, not at the leaf under the centre of the screen.
- **Search** runs over every level at once and marks hits where they sit on the map, so "where does
  Queequeg appear" gets a spatial answer.
- **Echoes** draw the novel's foreshadowing as arcs: the coffin built in chapter 110 becomes the
  life-buoy in 126 and the thing Ishmael floats away on in the epilogue. They fade out once you are
  inside a passage, where an arc to somewhere off-screen is just a line across the page.

### Cost

Reading the whole book end to end takes about 200x of zoom. The default `zoomSteps` top out at 8x, so
the range is widened in `options.camera` — the camera clamps to the first and last step.

Every node at a given depth shares that depth's opacity, so the crossfade is published as a handful of
CSS custom properties (`--lod-0`, `--lod-1`, …) written by one `react()` side-effect per camera frame.
The 161 summary nodes then render once and never re-render while you pan or zoom. Only the chapter text
is reactive, and only the chapters actually on screen are mounted; `chapters.json` is dynamically
imported the first time you zoom deep enough to need it.

The book isn't in the store. 208,000 words have no business being records with migrations and undo
history, and keeping them out of it means every tldraw tool still works normally on top of the text.

### Reusing it

Nothing in `src/semantic-zoom` knows it is looking at a novel. It takes a tree of strings, an optional
list of cross-references and an optional loader for deeper text. See "Zoom into the tldraw SDK" for the
same component over a codebase, with four levels instead of six and no deep text at all.
