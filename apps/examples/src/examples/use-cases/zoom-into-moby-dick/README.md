---
title: Zoom into Moby Dick
component: ./ZoomIntoMobyDickExample.tsx
priority: 2
keywords:
  [semantic zoom, level of detail, lod, camera, zoom steps, text, reading, summary, deep zoom]
---

Semantic zoom over a whole novel: one sentence zooms out to the whole book and in to Melville's own text.

---

Fully zoomed out, the canvas holds a single sentence summarising _Moby Dick_. Zoom in and it becomes a
paragraph, then a page, then a chapter-by-chapter outline, then the book itself — about 208,000 words
of it. Zooming into one corner of the paragraph opens that part of the story rather than the next level
of the book as a whole.

### The tree does the work

The obvious implementation reads `editor.getZoomLevel()` and swaps a shape's text. That can't give you
the second half of the behaviour, because there is no "this" to zoom into.

Instead the book is a tree, and every node's children subdivide its rectangle. The root sentence owns a
1000-unit square; its six children each own a cell of that square; their children own cells of those,
down to 136 chapters. Drilling into a passage then falls out for free, because the passage's children are
simply the nodes that grow first when you zoom there.

Font size is picked per node in `layout.ts` so that the text roughly fills its rectangle, which means
each level lands at a comfortable reading size at its own point in the zoom range. Text is laid out at a
fixed 16px and then scaled by its own transform, so line breaking is computed once and identical at every
depth, and the browser rasterises glyphs at their final composited size.

### Handing off between levels

A level takes over when its **parent's** text has grown to `HANDOFF_PX` on screen, and hands on when its
own text reaches that same size. Because both sides of a handoff are the same zoom, one level is always
leaving exactly as the next arrives.

Deriving the entry from the parent rather than from the level itself matters more than it looks. Running
a level until its _child_ became readable let a level whose child is much denser grow without bound — the
chapter summaries reached 110px before the full text took over, which is most of an octave of zoom where
nothing happens but text getting bigger. Giving entry and exit independent pixel thresholds capped the
size but pulled the two boundaries apart, so the book sentence and the act summaries sat on top of one
another at full strength instead of crossfading.

### Cost

Reading the whole book takes about 90x of zoom. The default `zoomSteps` top out at 8x, so the range is
widened in `options.camera` — the camera clamps to the first and last step.

Every node at a given depth shares that depth's opacity, so the crossfade is published as a handful of
CSS custom properties (`--lod-0`, `--lod-1`, …) written by one `react()` side-effect per camera frame.
The 161 summary nodes then render once and never re-render while you pan or zoom. Only the chapter text
is reactive, and only the chapters actually on screen are mounted; `chapters.json` is dynamically
imported the first time you zoom deep enough to need it.

The book isn't in the store. 208,000 words have no business being records with migrations and undo
history, and keeping them out of it means every tldraw tool still works normally on top of the text.
