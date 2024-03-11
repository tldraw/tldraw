---
title: Bounds Snapping Shape
component: ./BoundsSnappingShape.tsx
category: shapes/tools
priority: 3
---

Custom shapes with special bounds snapping behaviour.

---

This example shows how to create a shape with custom snapping geometry. When shapes are moved around in snap mode, they will snap to the bounds of other shapes by default. However a shape can return custom snapping geometry to snap to instead. This example creates a playing card shape. The cards are designed to snap together so that the top-left icon remains visible when stacked, similar to a hand of cards in a game.The most relevant code for this customisation is in playing-card-util.tsx.
