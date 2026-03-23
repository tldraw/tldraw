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

Compare axis-aligned and rotated selection bounds for the current selection.

---

This example shows how to read the current selection's axis-aligned bounds with `getSelectionPageBounds()` and its rotated bounds with `getSelectionRotatedPageBounds()`. Here we highlight both types of selection box so you can compare how the axis-aligned and rotated measurements behave for (1) a single rotated shape, (2) a grouped selection with a shared rotation, and (3) shapes with mixed rotations.
