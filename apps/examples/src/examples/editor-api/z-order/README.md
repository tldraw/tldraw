---
title: Z-order
component: ./ZOrderExample.tsx
priority: 2
keywords:
  [z-order, index, stacking, layers, reorder, sendToBack, bringToFront, sendBackward, bringForward]
---

Reorder shapes programmatically using the editor's z-order methods.

---

This example shows how to use the four z-order methods to control shape stacking:

- `editor.sendToBack(ids)` — move shapes to the very bottom
- `editor.bringToFront(ids)` — move shapes to the very top
- `editor.sendBackward(ids)` — move shapes one step down (by default, only past overlapping shapes)
- `editor.bringForward(ids)` — move shapes one step up (by default, only past overlapping shapes)

Select one or more shapes and use the buttons to see the stacking order change. When multiple shapes are selected, their relative order is preserved. For `sendBackward` and `bringForward`, pass `{ considerAllShapes: true }` to move past non-overlapping shapes too.
