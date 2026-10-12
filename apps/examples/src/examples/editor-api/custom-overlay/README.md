---
title: Custom overlay
component: ./CustomOverlayExample.tsx
priority: 2
keywords: [overlay, overlayutil, canvas, render, 2d, cursor]
---

Draw a pointer-following ring on the canvas overlay layer with a custom `OverlayUtil`.

---

Overlays are the canvas-drawn UI above shapes: selection handles, the brush rectangle, snap indicators, collaborator brushes and scribbles. They render into a Canvas 2D context in page space rather than the React tree, which keeps them cheap during fast interactions.

To add one, subclass `OverlayUtil` and implement `isActive()`, `getOverlays()`, and `render()`, then pass it to `<Tldraw overlayUtils>` alongside `defaultOverlayUtils`. This example adds a pink ring that follows the pointer. Move the mouse and zoom in and out: the ring stays the same size on screen because `render()` scales by the zoom level.
