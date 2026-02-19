---
title: Z-order
component: ./ZOrderExample.tsx
priority: 3
keywords: [z-order, stacking, reorder, bring to front, send to back, layer, depth]
---

Manipulate shape z-order (stacking) using the editor's reordering methods.

---

This example demonstrates how to use the four reordering methods to programmatically change the stacking order of shapes on the canvas: `sendToBack`, `sendBackward`, `bringForward`, and `bringToFront`. Create or select overlapping shapes, then use the buttons to change their z-order. The `sendBackward` and `bringForward` methods move shapes one position relative to overlapping shapes, while `sendToBack` and `bringToFront` move shapes to the absolute bottom or top of the stack.
