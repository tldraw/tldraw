---
title: Comment clustering
component: ./CommentClusteringExample.tsx
priority: 3
keywords: [comments, commenting, clustering, pins, zoom, count badge, collaboration]
---

Merge nearby comment pins into a count badge as you zoom out.

---

When a board fills up with comments, pins that sit close together overlap and become unreadable at low zoom. The commenting toolkit solves this with clustering: nearby anchors merge into a single count badge as you zoom out, and split back into individual pins as you zoom in.

This example drives the clustering pipeline directly. `computeClusterTable` precomputes, across the whole zoom range, which anchors merge and at which zoom level — using a minimum-spanning-tree merge with hysteresis so pins don't flicker at the threshold. `createClusterRuntime` wraps that table so a camera move is just a lookup: on each zoom change it returns the currently-visible nodes, each either a single member (drawn as a `CommentPin`) or a merged group (drawn as a `CountBadge`).

Zoom out with `⌘`/`ctrl`-scroll or a pinch gesture to watch the two groups collapse.
