---
title: Shape with onDoubleClickEdge
component: ./ShapeWithOnDoubleClickEdgeExample.tsx
priority: 1
keywords: [onDoubleClickEdge, custom shape, resize, edge, double click]
---

Toggle a custom shape between two sizes with `ShapeUtil.onDoubleClickEdge`.

---

Implement `onDoubleClickEdge` on your shape util to react when the user double-clicks one of the four edge resize handles (top, right, bottom, left) of a selected shape. Return a shape partial to update the shape, or nothing to fall through to the default double-click behavior. Corners have a matching `onDoubleClickCorner` handler.

Select the shape and double-click one of its edges: it toggles between 400×320 and 200×200.
