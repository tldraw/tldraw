---
title: Region comments
component: ./CommentRegionsExample.tsx
priority: 7
keywords: [comments, commenting, region, area, drag, resize, reveal, pin corner, collaboration]
---

Comment on a rectangular area of the canvas, and tune how regions reveal, move, and resize.

---

A region anchor attaches a comment thread to a rectangular area of the page rather than a single point or shape. Region commenting is off by default: with the comment tool active, clicking places a point comment and clicking a shape attaches to it. Enable regions by configuring the tool with `CommentTool.configure({ enableRegions: true })` — then dragging the comment tool out creates a region anchor covering the dragged rectangle, drawn as a dashed box with the thread's pin on one corner.

Beyond `enableRegions`, `CommentingOptions` exposes the interaction surface:

- `regionReveal` — when the dashed box and its handles show: while the pointer is inside the region (`pointer`), while its pin is hovered (`pin-hover`), or only while the thread is open (`open`).
- `regionMove` — how a region is dragged to a new spot: by its pin, by its body, or either.
- `regionResize` — the resize affordance: corner handles, edge handles, or none.
- `regionPinCorner` — which corner of the region the pin and composer sit on, as a normalized 0–1 offset.

Like the rest of the commenting configuration, region options are set once at tool registration and anything unset falls back to `defaultCommentingOptions`. This example's control panel remounts the editor with a newly configured tool on every change; the comments live in a shared store, so every placed thread survives the switch.
