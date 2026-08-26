---
title: Canvas mask
component: ./MaskWindowExample.tsx
keywords:
  [
    mask,
    clip,
    clippath,
    overlay,
    selection bounds,
    getselectionrotatedscreenbounds,
    usequickreactor,
    css,
    viewport,
  ]
priority: 2
---

Dim the whole canvas except the selected shapes, using a CSS clip-path overlay.

---

A translucent white `<div>` in the `InFrontOfTheCanvas` slot covers the canvas. A `useQuickReactor` reads `editor.getSelectionRotatedScreenBounds()` and `editor.getSelectionRotation()` and sets the overlay's `clip-path` to a polygon that winds around the selection, so only the selection shows through. With nothing selected the clip is cleared and the whole canvas is dimmed.

Try selecting, dragging, rotating, and zooming: the window follows the selection.
