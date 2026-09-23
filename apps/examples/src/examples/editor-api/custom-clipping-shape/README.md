---
title: Custom clipping shape
component: ./CustomClippingExample.tsx
priority: 1
keywords:
  [
    clipping,
    clip path,
    mask,
    getClipPath,
    shouldClipChild,
    polygon,
    children,
    parent-child,
    circular,
  ]
---

Clip child shapes to a circle with `getClipPath` and `shouldClipChild`.

---

Any `ShapeUtil` can clip its children by implementing `getClipPath`, which returns a polygon in the shape's local coordinates. The editor transforms it to page space, intersects it with any ancestor clip paths, and applies it to every child. Implement `shouldClipChild` to leave some children unclipped (frames use this to skip arrows).

The example defines a circle shape that clips its children to a polygon approximation of the circle. Try dragging shapes into and out of the circle, resizing it, or clicking with the "Circle clip" tool (shortcut `c`) to place new circles. The "Disable clipping" button flips a shared atom that `shouldClipChild` reads, turning clipping off for every circle at once.
