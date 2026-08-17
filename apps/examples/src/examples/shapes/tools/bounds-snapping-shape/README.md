---
title: Custom snapping
component: ./BoundsSnappingShape.tsx
priority: 3
keywords:
  [
    snapping,
    snap mode,
    bounds snapping,
    custom snapping,
    getboundssnapgeometry,
    geometry,
    custom shape,
    playing cards,
  ]
---

Give a custom shape its own snap points with `getBoundsSnapGeometry`.

---

When shapes are moved in snap mode, they snap to the bounding boxes of nearby shapes by default. A shape util can override `getBoundsSnapGeometry` to return different points, which are used both when this shape is dragged and when other shapes snap against it.

The playing card shape here returns the corners and center of the small square around its top-left suit icon. Cards therefore snap together so that each icon stays visible when they're fanned out, like a hand of cards.

Try dragging one card over another; snap mode is turned on for you in `onMount`, and you can hold cmd/ctrl while dragging to snap when it's off. Use the joker tool in the toolbar (or press `c`) to add more cards.
