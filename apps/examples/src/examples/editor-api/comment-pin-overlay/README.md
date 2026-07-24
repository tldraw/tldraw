---
title: Comment pins as a canvas overlay
component: ./CommentPinOverlayExample.tsx
priority: 3
keywords: [comment, pin, overlay, overlayutil, zindex, layering, cursor, selection]
---

Draw comment pins as a canvas overlay that layers above selection chrome and below collaborator cursors.

---

Comment pins need to sit above shapes and selection outlines but below collaborator cursors. This example models the pin as an `OverlayUtil` — a canvas-space pseudo-shape, the same kind of object as the built-in selection handles and cursors — so it drops into the single ordered overlay canvas at `zIndex: 1050`, in the gap between arrow hints (1000) and collaborator cursors (1100). The layering is that one integer; there's no second canvas.

The pin marker is drawn to the canvas; its thread popover stays in the React tree and anchors to the pin's screen position. Click a pin to open its thread. Select a shape to see the pin paint over the selection outline, and note the parked collaborator cursor painting over the pin.
