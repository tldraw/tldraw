---
title: Selection UI
component: ./SelectionUiExample.tsx
priority: 2
keywords:
  [
    selection,
    ui overlay,
    infrontofthecanvas,
    custom controls,
    duplicate,
    handles,
    usevalue,
    getselectionrotatedscreenbounds,
  ]
---

Add duplicate-in-direction buttons around the selection using the `InFrontOfTheCanvas` slot.

---

The `InFrontOfTheCanvas` component renders in screen space above the canvas, so anything you put there stays a fixed size while the camera moves. This example reads `editor.getSelectionRotatedScreenBounds()` and `editor.getSelectionRotation()` inside `useValue` to position four buttons around the selection, rotated to match it. Each button calls `editor.duplicateShapes` with an offset computed from the selection's rotated bounds.

Try selecting a shape, rotating it, and clicking the arrows.
