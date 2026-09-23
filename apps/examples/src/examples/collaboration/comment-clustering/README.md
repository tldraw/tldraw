---
title: Comment clustering
component: ./CommentClusteringExample.tsx
priority: 3
keywords: [comments, commenting, clustering, pins, zoom, count badge, collaboration]
---

Merge nearby comment pins into a count badge as you zoom out.

---

When a board fills with comments, pins that sit close together overlap and become unreadable at low zoom. Clustering merges nearby anchors into a single count badge as you zoom out, and splits them back into pins as you zoom in. Splits happen at a wider spacing than merges, so pins don't flicker at the threshold, and clicking a badge zooms to just past the point where it splits.

`CanvasComments` does this for you — clustering is on by default and needs no configuration. Turn it off with `CommentTool.configure({ enableClustering: false })` and every pin renders individually at every zoom.

This example seeds two loose groups of threads. Zoom out with `⌘`/`ctrl`-scroll or a pinch gesture to watch each group collapse.
