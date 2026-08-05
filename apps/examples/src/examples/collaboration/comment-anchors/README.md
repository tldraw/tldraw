---
title: Comment anchors
component: ./CommentAnchorsExample.tsx
priority: 4
keywords: [comments, commenting, anchors, shape, region, point, collaboration]
---

The ways a comment can attach to the canvas.

---

Every thread carries an `anchor` that says where on the page it lives: a `point`, a `shape` it tracks as that shape moves and resizes, or a `region` covering an area. A fourth kind, `page`, has no pin and surfaces in a list instead.

This example seeds one of each pinned kind, with a shape anchor shown both precise and imprecise. Drag the shape to watch its pins follow it.
