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

This example shows how to read the current selection's axis-aligned bounds with `getSelectionPageBounds()` and its rotated bounds with `getSelectionRotatedPageBounds()`. It draws both boxes over the selection, reports their dimensions in a small UI panel, and includes controls for reselection, rotation, and reset so you can see how the two measurements diverge as the selection rotates.
