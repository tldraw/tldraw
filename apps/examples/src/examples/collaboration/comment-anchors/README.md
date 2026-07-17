---
title: Comment anchors
component: ./CommentAnchorsExample.tsx
priority: 4
keywords: [comments, commenting, anchors, shape, region, point, text range, collaboration]
---

The five ways a comment can attach to the canvas.

---

Every comment thread carries an `anchor` — a discriminated union that says where on the page the thread lives. `CanvasComments` reads the anchor and draws each kind in the right place. This example seeds one thread of each kind, then lets the overlay position them:

- **shape (imprecise)** — attached to a shape, the pin sitting at its top-right badge spot. The stored `x`/`y` are normalized (0–1), so the pin tracks the shape as it moves and resizes.
- **shape (precise)** — attached to an exact normalized spot inside a shape (what you get by holding `alt` while placing).
- **point** — a bare page coordinate, unattached to any shape.
- **region** — a rectangular area; the pin sits on a corner and the region box is drawn.

Two more anchor kinds exist but the default overlay doesn't give them a distinct pin: **page** anchors attach a thread to the whole board (no pin — they surface in a comments list instead), and **text-range** anchors attach a thread to a character range within a text shape — the "Comment on a text range" example shows a full text-range flow.

Drag the shape around to watch the shape-anchored pins follow it, or pick the comment tool and click to add your own thread anchored wherever you place it.
