---
title: Selection bounds
component: ./SelectionBoundsExample.tsx
priority: 4
keywords:
  [
    selection,
    bounds,
    rotation,
    geometry,
    getselectionpagebounds,
    getselectionrotatedpagebounds,
    getselectionrotation,
  ]
---

Visualize the difference between `getSelectionPageBounds()` and `getSelectionRotatedPageBounds()` for the current selection.

---

`getSelectionPageBounds()` returns the smallest upright rectangle around the selection; `getSelectionRotatedPageBounds()` returns a box aligned to the selection's shared rotation, which is what the visible selection handles use. This example draws both over the canvas with an `InFrontOfTheCanvas` component that converts page bounds to viewport pixels using `pageToViewport()` and the zoom level.

Select the single rotated shape, the group with a shared rotation, and the two ungrouped shapes with different rotations to see when the two boxes differ and when the rotated box falls back to axis-aligned.
