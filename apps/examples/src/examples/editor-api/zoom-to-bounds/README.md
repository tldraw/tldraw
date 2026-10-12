---
title: Zoom to bounds
component: ./ZoomToBoundsExample.tsx
priority: 1
keywords: [zoom, zoomToBounds, camera, bounds, Box, inset, animation, viewport, programmatic zoom]
---

Move the camera to fit a page-space box in the viewport with `editor.zoomToBounds()`.

---

`zoomToBounds(bounds, opts)` fits a `Box` (or any `{ x, y, w, h }`) into the viewport. Two boxes are drawn on the canvas, and the buttons zoom to each one or to `Box.Common` of both. The camera keeps the viewport's aspect ratio, so the visible area may be larger than the box you pass. `inset` adds screen-space padding around the box (defaults to `options.zoomToFitPadding`), and `animation` animates the move instead of jumping.
