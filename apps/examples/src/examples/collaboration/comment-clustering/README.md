---
title: Comment clustering
component: ./CommentClusteringExample.tsx
priority: 3
keywords: [comments, commenting, clustering, pins, zoom, count badge, collaboration]
---

Merge nearby comment pins into a count badge as you zoom out.

---

When a board fills with comments, pins that sit close together overlap and become unreadable at low zoom. Clustering merges nearby anchors into a single count badge as you zoom out, and splits them back into pins as you zoom in. Splits happen at a wider spacing than merges, so pins don't flicker at the threshold.

Zoom out with `⌘`/`ctrl`-scroll or a pinch gesture to watch the two groups collapse.
