---
title: Custom snapping
component: ./BoundsSnappingShape.tsx
category: shapes/tools
priority: 3
keywords:
  [
    snapping,
    snap mode,
    bounds snapping,
    custom snapping,
    getboundssnappinggeometry,
    geometry,
    custom shape,
    playing cards,
  ]
---

Custom shapes with special bounds snapping behaviour.

---

This example shows how to create a shape with custom snapping geometry. When shapes are moved around in snap mode, they will snap to the bounds of other shapes by default. However, a shape can return custom snapping geometry to snap to instead.

In this case, we've created a custom playing card shape. The cards are designed to snap together so that the top-left icon remains visible when stacked, similar to a hand of cards in a game.
